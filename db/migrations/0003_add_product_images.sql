BEGIN;

CREATE TABLE IF NOT EXISTS product_images (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    file_id BIGINT NOT NULL UNIQUE REFERENCES files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_images_product_created_idx ON product_images (product_id, id);

-- Make every existing legacy image the first image in its product collection.
INSERT INTO product_images (product_id, file_id)
SELECT p.id, p.image_file_id
FROM products p
WHERE p.image_file_id IS NOT NULL
ON CONFLICT (file_id) DO NOTHING;

COMMIT;
