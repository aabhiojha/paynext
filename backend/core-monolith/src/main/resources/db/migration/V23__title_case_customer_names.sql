UPDATE customers
SET name = initcap(lower(name))
WHERE name IS NOT NULL;
