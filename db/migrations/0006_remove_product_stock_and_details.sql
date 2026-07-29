BEGIN;

ALTER TABLE products
    DROP COLUMN IF EXISTS details,
    DROP COLUMN IF EXISTS quantity;

ALTER TABLE order_items
    DROP COLUMN IF EXISTS product_details;

COMMIT;
