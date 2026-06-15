# SaaS Payment Management

A multi-tenant web application for businesses that bill customers on a recurring basis. A tenant
(a business) keeps track of its customers, the products/services those customers are subscribed to,
and the billing cadence for each subscription. The system figures out when the next payment is due
and emails reminders automatically.

It's built as a small set of services rather than a single app, mostly to keep email/notification
work off the main request path.

## Why

Manually tracking who owes what and when — across weekly, monthly, quarterly, or annual billing
cycles — is tedious and easy to get wrong. This handles the bookkeeping: it stores customers and
their subscriptions, computes the next billing date from the cadence, and sends payment reminders on
a schedule so nobody has to chase that manually.

Because it's multi-tenant, multiple businesses can use the same deployment without seeing each
other's data.

## What's in it

- **Tenants** — each business is a tenant with its own users, customers, and data.
- **Roles** — three levels:
  - `SUPER_ADMIN` — runs the platform: manages tenants and platform (subscription) plans.
  - `TENANT_ADMIN` — manages their own tenant: users, customers, products, subscriptions. Has
    delete permissions.
  - `TENANT_USER` — same screens as the admin, minus destructive actions.
- **Customers** — the people/companies a tenant bills.
- **Products** — what a tenant sells, optionally with named pricing plans.
- **Subscriptions** — links a customer to a product with a price snapshot and a billing cadence
  (weekly, fortnightly, monthly, quarterly, semi-annual, annual). Can be active, paused, or
  cancelled.
- **Reminders** — a scheduled job runs hourly, works out which subscriptions have a payment coming
  up, and sends email reminders. It also auto-cancels overdue plans. Sent/failed/skipped reminders
  are tracked and viewable in Upcoming and History tabs.
- **Invitations** — admins invite users by email; the invitee sets their password via an emailed
  link.
- **Audit log** — records changes as a plain-English activity feed with field-level diffs.
- **Dashboards** — separate views for the super admin (platform-wide) and tenants (their own
  numbers).

## Architecture

```
frontend (Next.js)  ──HTTP──>  core-monolith (Spring Boot API)  ──>  PostgreSQL
                                       │
                                       └──HTTP──>  notification-service  ──>  SendGrid (email)
```

- **`backend/core-monolith`** — the main API. Spring Boot 3.5 / Java 21, Spring Security with JWT
  auth, Spring Data JPA, Flyway for migrations, PostgreSQL. Organized by module (auth, tenant,
  customer, product, subscription, reminder, platformplan, invitation, audit, dashboard). Exposes
  OpenAPI/Swagger docs via springdoc.
- **`backend/notification-service`** — a separate Spring Boot service that sends transactional email
  (invitations, password resets, payment reminders) through SendGrid. The monolith calls it over
  HTTP.
- **`frontend`** — Next.js 16 / React 19 app (TypeScript, Tailwind CSS 4, Zustand for state).
- **PostgreSQL 16** — single database, schema managed by Flyway migrations in the core monolith.

> Note: there's a `RABBITMQ_PLAN.md` describing a planned move from the synchronous HTTP call
> between the monolith and notification-service to an async RabbitMQ queue. That's a plan, not yet
> implemented.

## Tech stack

| Layer        | Stack                                                           |
|--------------|-----------------------------------------------------------------|
| Frontend     | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand       |
| Backend      | Java 21, Spring Boot 3.5 (Web, Security, Data JPA, Validation)  |
| Auth         | JWT (jjwt)                                                      |
| Database     | PostgreSQL 16, Flyway migrations                                |
| Email        | SendGrid                                                        |
| API docs     | springdoc OpenAPI / Swagger UI                                  |
| Infra        | Docker / Docker Compose                                         |

## Running it

Everything is wired up in `docker-compose.yml`: Postgres, the two backend services, and the
frontend.

1. Copy the env template and fill it in:

   ```bash
   cp .env.example .env
   ```

   At minimum set `POSTGRES_PASSWORD`, `JWT_SECRET`, and the SendGrid values
   (`SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`) if you want email to actually
   send.

2. Start everything:

   ```bash
   docker compose up --build
   ```

3. Once it's healthy:
   - Frontend: http://localhost:3000
   - API: http://localhost:8080/api/v1
   - Swagger UI: http://localhost:8080/swagger-ui.html

Flyway runs the database migrations automatically on startup.

### Running pieces individually (development)

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend (each service has its own Maven wrapper):

```bash
cd backend/core-monolith
./mvnw spring-boot:run
```

```bash
cd backend/notification-service
./mvnw spring-boot:run
```

You'll need a Postgres instance running and the relevant environment variables set (see
`.env.example` and `docker-compose.yml` for what each service expects).

## Configuration

All config is via environment variables — see `.env.example` for the full list. The important ones:

| Variable                  | What it's for                                   |
|---------------------------|-------------------------------------------------|
| `POSTGRES_*`              | Database name, user, password                   |
| `JWT_SECRET`              | Signing secret for auth tokens                  |
| `JWT_EXPIRATION_SECONDS`  | Token lifetime (default 86400 / 1 day)          |
| `NEXT_PUBLIC_API_URL`     | API base URL the browser calls                  |
| `API_INTERNAL_URL`        | Internal API origin used by the Next.js proxy   |
| `FRONTEND_BASE_URL`       | Used for CORS and for building invite/reset links |
| `SENDGRID_*`              | Email sending credentials and sender identity   |

## Repository layout

```
.
├── backend/
│   ├── core-monolith/        # main API
│   └── notification-service/ # email sender
├── frontend/                 # Next.js app
├── docker-compose.yml
└── .env.example
```
