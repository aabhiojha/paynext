ALTER TABLE users
DROP
CONSTRAINT fk_users_on_created_by;

ALTER TABLE customer_products
    ADD created_by BIGINT;

ALTER TABLE customer_products
    ADD updated_by BIGINT;

ALTER TABLE customers
    ADD created_by BIGINT;

ALTER TABLE customers
    ADD updated_by BIGINT;

ALTER TABLE platform_plans
    ADD created_by BIGINT;

ALTER TABLE platform_plans
    ADD updated_by BIGINT;

ALTER TABLE product_plans
    ADD created_by BIGINT;

ALTER TABLE product_plans
    ADD updated_by BIGINT;

ALTER TABLE products
    ADD created_by BIGINT;

ALTER TABLE products
    ADD updated_by BIGINT;

ALTER TABLE reminders
    ADD created_by BIGINT;

ALTER TABLE reminders
    ADD updated_by BIGINT;

ALTER TABLE tenant_platform_plans
    ADD created_by BIGINT;

ALTER TABLE tenant_platform_plans
    ADD updated_by BIGINT;

ALTER TABLE tenants
    ADD created_by BIGINT;

ALTER TABLE tenants
    ADD updated_by BIGINT;

ALTER TABLE users
    ADD updated_by BIGINT;