CREATE TYPE reminder_status AS ENUM ('SENT', 'FAILED', 'SKIPPED');

CREATE TABLE reminders
(
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT          NOT NULL REFERENCES tenants (id),
    customer_product_id BIGINT          NOT NULL REFERENCES customer_products (id),
    status              reminder_status NOT NULL,
    sent_at             TIMESTAMPTZ,
    error_message       TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reminders_tenant ON reminders (tenant_id, created_at DESC);
