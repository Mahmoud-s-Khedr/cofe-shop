BEGIN;

DROP INDEX IF EXISTS products_active_available_created_idx;
DROP INDEX IF EXISTS products_category_active_created_idx;

ALTER TABLE products
    DROP COLUMN IF EXISTS is_active;

CREATE INDEX IF NOT EXISTS products_available_created_idx
    ON products (is_available, created_at DESC);
CREATE INDEX IF NOT EXISTS products_category_available_created_idx
    ON products (category, is_available, created_at DESC);

COMMIT;
