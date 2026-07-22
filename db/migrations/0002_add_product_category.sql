BEGIN;

DO $$
BEGIN
    CREATE TYPE product_category AS ENUM (
        'coffee',
        'breakfast',
        'burger',
        'shawarma',
        'tacos',
        'drinks'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS category product_category NOT NULL;

ALTER TABLE products
    ALTER COLUMN category SET NOT NULL;

CREATE INDEX IF NOT EXISTS products_category_active_created_idx
    ON products (category, is_active, created_at DESC);

COMMIT;
