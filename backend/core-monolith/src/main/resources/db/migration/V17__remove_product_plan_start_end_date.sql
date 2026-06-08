ALTER TABLE product_plans
    DROP COLUMN IF EXISTS start_date,
    DROP COLUMN IF EXISTS end_date;
