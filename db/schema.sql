-- PostgreSQL schema for the BW Café delivery-orders backend.
-- Single-restaurant ordering system: flat product catalogue, guest or
-- registered checkout, admin order review. See plan.md for the full model.
-- Ensure your database was created with ENCODING 'UTF8'.

BEGIN;

-- ---------- Enums ----------
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
CREATE TYPE user_status AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'BLOCKED');
CREATE TYPE verification_purpose AS ENUM ('REGISTRATION', 'PASSWORD_RESET');
CREATE TYPE order_type AS ENUM ('DELIVERY', 'PICKUP');
CREATE TYPE order_status AS ENUM (
    'PENDING', 'CONFIRMED', 'PREPARING', 'READY',
    'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED', 'REJECTED'
);

-- ---------- Users and auth ----------
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(32) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    status user_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
    phone_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE verification_codes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone VARCHAR(32) NOT NULL,
    code_hash TEXT NOT NULL,
    purpose verification_purpose NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX verification_codes_phone_purpose_created_idx
    ON verification_codes (phone, purpose, created_at DESC);

CREATE TABLE refresh_tokens (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id, created_at DESC);
CREATE INDEX refresh_tokens_expires_idx ON refresh_tokens (expires_at);

-- ---------- Files (Cloudinary metadata) ----------
CREATE TABLE files (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    asset_id TEXT NOT NULL UNIQUE,
    public_id TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    format TEXT,
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
    width INTEGER,
    height INTEGER,
    original_name TEXT,
    mime_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Products ----------
CREATE TABLE products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    details TEXT,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    quantity INTEGER CHECK (quantity IS NULL OR quantity >= 0),
    image_url TEXT,
    image_file_id BIGINT UNIQUE REFERENCES files(id) ON DELETE SET NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product images are ordered by insertion. The legacy image columns above
-- continue to mirror the first image for backward-compatible API responses.
CREATE TABLE product_images (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    file_id BIGINT NOT NULL UNIQUE REFERENCES files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX product_images_product_created_idx ON product_images (product_id, id);

CREATE INDEX products_active_available_created_idx
    ON products (is_active, is_available, created_at DESC);
CREATE INDEX products_price_idx ON products (price);
CREATE INDEX products_search_tsv_idx
    ON products USING GIN (to_tsvector('simple', title || ' ' || COALESCE(description, '')));

-- ---------- Orders ----------
CREATE TABLE orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    order_type order_type NOT NULL,
    address TEXT,
    pickup_time TIMESTAMPTZ,
    status order_status NOT NULL DEFAULT 'PENDING',
    screenshot_url TEXT,
    screenshot_file_id BIGINT UNIQUE REFERENCES files(id) ON DELETE SET NULL,
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
    currency TEXT NOT NULL DEFAULT 'MRU',
    customer_notes TEXT,
    cancellation_reason TEXT,
    rejection_reason TEXT,
    guest_access_token_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    CHECK (
        (order_type = 'DELIVERY' AND address IS NOT NULL)
        OR (order_type = 'PICKUP' AND pickup_time IS NOT NULL)
    )
);

CREATE INDEX orders_user_created_idx ON orders (user_id, created_at DESC);
CREATE INDEX orders_status_created_idx ON orders (status, created_at DESC);
CREATE INDEX orders_customer_phone_idx ON orders (customer_phone);

CREATE TABLE order_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    product_title TEXT NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX order_items_order_idx ON order_items (order_id);
CREATE INDEX order_items_product_idx ON order_items (product_id);

CREATE TABLE order_status_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    previous_status order_status,
    new_status order_status NOT NULL,
    changed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX order_status_history_order_idx ON order_status_history (order_id, created_at DESC);

-- ---------- Reviews ----------
CREATE TABLE reviews (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_item_id BIGINT NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX reviews_product_idx ON reviews (product_id, created_at DESC);

COMMIT;
