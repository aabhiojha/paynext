# RabbitMQ Integration Plan — Core Monolith ↔ Notification Service

## Context

Today `core-monolith` calls `notification-service` over **synchronous HTTP**:
`NotificationClient` (`backend/core-monolith/.../invitation/client/NotificationClient.java`) uses
`RestClient.post()` against `NotificationController`
(`backend/notification-service/.../controller/NotificationController.java`) at
`/internal/notify/{invitation-user,invitation-admin,password-reset,reminder}`.

This couples the services at runtime (core's `depends_on` requires notification-service healthy),
makes email latency/failures block the caller, and offers no retry or buffering. We introduce
**RabbitMQ** as an async work-queue: the monolith publishes notification events, the worker
consumes them independently.

Two call semantics must be preserved:

- **Fire-and-forget** — `sendInvitation`, `sendAdminInvitation`, `sendPasswordReset`.
  `dispatch()` already swallows and logs failures.
- **Result-dependent** — `sendReminder`. `ReminderService.sendReminder()` (lines 215-235) lets
  exceptions propagate so it can record `ReminderStatus.SENT` vs `FAILED`. Going async breaks this
  synchronous coupling and requires a status-lifecycle redesign.

**Decisions:** RabbitMQ · at-least-once delivery via transactional outbox · phased full migration,
ending with the REST path removed.

---

## Phase 0 — Infrastructure

- **`docker-compose.yml`**: add a `rabbitmq:3.13-management` service on the `backend` network with a
  `rabbitmq-diagnostics -q ping` healthcheck. Add `rabbitmq` (`condition: service_healthy`) to the
  `depends_on` of both `core-monolith` and `notification-service`. Inject
  `SPRING_RABBITMQ_HOST/PORT/USERNAME/PASSWORD` into both services.
- **`.env.example`**: add `RABBITMQ_USER` and `RABBITMQ_PASSWORD`.
- **Both POMs** (`backend/core-monolith/pom.xml`, `backend/notification-service/pom.xml`): add
  `spring-boot-starter-amqp`.
- Keep `NOTIFICATION_SERVICE_URL` and the REST controller during migration (removed in Phase 4).

```yaml
  rabbitmq:
    image: rabbitmq:3.13-management
    restart: unless-stopped
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER:-app}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    ports:
      - "15672:15672"   # management UI (dev only)
    networks: [backend]
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 15s
      timeout: 5s
      retries: 5
```

---

## Phase 1 — Topology + fire-and-forget migration (low risk)

**Topology** (declared in both services):

- Topic exchange `notifications`; durable queue `notifications.email` bound with `email.#`.
- DLQ `notifications.email.dlq` via `x-dead-letter-exchange` / `x-dead-letter-routing-key` args.
- `Jackson2JsonMessageConverter` bean on both sides.
- Listener retry in notification-service props:
  `spring.rabbitmq.listener.simple.retry.{enabled=true,max-attempts,initial-interval}` so exhausted
  retries dead-letter.

```java
@Configuration
public class NotificationQueueConfig {
    public static final String EXCHANGE = "notifications";
    public static final String QUEUE    = "notifications.email";
    public static final String DLQ      = "notifications.email.dlq";

    @Bean TopicExchange exchange() { return new TopicExchange(EXCHANGE); }

    @Bean Queue queue() {
        return QueueBuilder.durable(QUEUE)
                .withArgument("x-dead-letter-exchange", "")
                .withArgument("x-dead-letter-routing-key", DLQ)
                .build();
    }
    @Bean Queue dlq()         { return QueueBuilder.durable(DLQ).build(); }
    @Bean Binding binding()   { return BindingBuilder.bind(queue()).to(exchange()).with("email.#"); }
    @Bean Jackson2JsonMessageConverter converter() { return new Jackson2JsonMessageConverter(); }
}
```

**Core (publisher) — `NotificationClient.java`**: replace `RestClient` with `RabbitTemplate`, keep
the public method signatures so `InvitationService` and `AuthService` callers are untouched. Enable
publisher confirms (`spring.rabbitmq.publisher-confirm-type=correlated`).

```java
public void sendInvitation(InviteNotificationPayload p) {
    rabbit.convertAndSend(EXCHANGE, "email.invitation.user", p);
}
```

**Notification service (consumer) — new `NotificationListener`**:

```java
@RabbitListener(queues = NotificationQueueConfig.QUEUE)
public void onMessage(NotificationMessage msg) {
    switch (msg.type()) {
        case INVITATION_USER  -> emailService.sendUserInvitation(...);
        case INVITATION_ADMIN -> emailService.sendAdminInvitation(...);
        case PASSWORD_RESET   -> emailService.sendPasswordReset(...);
        case REMINDER         -> emailService.sendReminder(...);   // Phase 2
    }
}
```

Reuse existing DTOs (`InviteEmailRequest`, `PasswordResetEmailRequest`, `ReminderEmailRequest`).
Carry a `messageId` (UUID) + `type` on every envelope for idempotency (Phase 3). Controller
endpoints stay until Phase 4.

---

## Phase 2 — Reminder migration + status redesign

Publish success ≠ delivery success, so `ReminderEntity` status can no longer be set synchronously.

- Add `QUEUED` to `ReminderStatus` (`.../common/enums/ReminderStatus.java`).
- In `ReminderService.sendReminder()` (`.../reminder/service/ReminderService.java:215`): save the
  reminder as `QUEUED` at publish time; stop catching the publish exception for status purposes.
- Add `reminderId` to `ReminderNotificationPayload` to correlate the result.
- **Result path**: notification-service publishes a result event to `email.reminder.result`
  (success/failure + reminderId + error). A new `@RabbitListener` in core flips the reminder to
  `SENT` (with `sentAt`) or `FAILED` (with `errorMessage`).
- **DLQ fallback**: a DLQ consumer in core marks the reminder `FAILED` if its message exhausts
  retries without a result.
- Confirm `QUEUED` renders acceptably in the reminder History/Upcoming tabs (transient state).

---

## Phase 3 — Guaranteed delivery: transactional outbox + idempotency

`ReminderService` is `@Transactional`; publishing inside the tx risks phantom sends on rollback,
publishing after commit risks loss on crash. Add the outbox:

- New `outbox` table + `OutboxEntity`/repository in core (Flyway migration, following existing
  migration conventions).
- Publishers write an outbox row **in the same DB transaction** as the business change instead of
  calling `RabbitTemplate` directly.
- A `@Scheduled` relay (reuse the existing scheduler that drives reminders) reads unsent rows,
  publishes, and marks them sent on publisher-confirm.
- Consumer idempotency: notification-service dedupes on `messageId` (a processed-ids table or
  short-TTL store) so at-least-once redelivery doesn't double-send email.

---

## Phase 4 — Decommission REST path

- Remove the four `@PostMapping`s from `NotificationController` (or delete it).
- Remove `RestClient` / `NotificationProperties` baseUrl usage and `NOTIFICATION_SERVICE_URL` from
  compose once nothing references it.
- Core's `depends_on` drops `notification-service`, keeps `rabbitmq`.

---

## Critical files

- `docker-compose.yml`, `.env.example`
- `backend/core-monolith/pom.xml`, `backend/notification-service/pom.xml`
- `backend/core-monolith/.../invitation/client/NotificationClient.java` (publisher)
- `backend/core-monolith/.../reminder/service/ReminderService.java` (status redesign, lines 215-235)
- `backend/core-monolith/.../reminder/client/ReminderNotificationPayload.java` (+ reminderId)
- `backend/core-monolith/.../common/enums/ReminderStatus.java` (+ `QUEUED`)
- `backend/notification-service/.../controller/NotificationController.java` (removed Phase 4)
- New: queue config (both services), `NotificationListener` (notification-service), result + DLQ
  listeners (core), `OutboxEntity`/repo/relay + Flyway migration (core)

---

## Verification

- **Infra**: `docker compose up rabbitmq` healthy; management UI on `:15672` shows exchange/queues.
- **Fire-and-forget**: trigger an invitation/password-reset; confirm a message flows through
  `notifications.email` and the email sends. Stop notification-service, trigger again, restart —
  the message should be consumed from the queue (proving decoupling).
- **Reminders**: run the reminder scheduler / manual `trigger`; verify rows go `QUEUED` → `SENT`,
  and a forced consumer failure routes to DLQ and ends `FAILED`.
- **Outbox/at-least-once**: kill core after the business commit but before relay publish; on
  restart the relay still publishes (no lost reminder). Redeliver a message twice and confirm
  idempotency prevents a duplicate email.
- Run both module test suites (`./mvnw test`) and add listener/publisher unit tests.
