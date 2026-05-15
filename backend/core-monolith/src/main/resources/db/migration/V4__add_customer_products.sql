CREATE TYPE customer_product_status AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

CREATE TABLE customer_products
(
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT                    NOT NULL REFERENCES tenants (id),
    customer_id BIGINT                    NOT NULL REFERENCES customers (id),
    product_id  BIGINT                    NOT NULL REFERENCES products (id),
    status      customer_product_status   NOT NULL DEFAULT 'ACTIVE',
    starts_at   TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
    ends_at     TIMESTAMPTZ,
    notes       TEXT,
    deleted_at  TIMESTAMPTZ,
    deleted_by  BIGINT REFERENCES users (id),
    created_at  TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ               NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cp_tenant_customer ON customer_products (tenant_id, customer_id);
CREATE INDEX idx_cp_tenant_status ON customer_products (tenant_id, status);
