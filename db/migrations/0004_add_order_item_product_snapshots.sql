BEGIN;

ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS product_category product_category,
    ADD COLUMN IF NOT EXISTS product_description TEXT,
    ADD COLUMN IF NOT EXISTS product_details TEXT,
    ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS order_item_images (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_item_id BIGINT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    file_id BIGINT NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
    url TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    UNIQUE (order_item_id, file_id),
    UNIQUE (order_item_id, position)
);

CREATE INDEX IF NOT EXISTS order_item_images_file_idx ON order_item_images (file_id);

COMMIT;
