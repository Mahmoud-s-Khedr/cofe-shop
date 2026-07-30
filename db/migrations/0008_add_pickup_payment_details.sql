BEGIN;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS bank_name TEXT,
    ADD CONSTRAINT orders_payment_details_check CHECK (
        (payment_method IS NULL AND bank_name IS NULL)
        OR (payment_method = 'CASH' AND bank_name IS NULL)
        OR (payment_method = 'BANK' AND bank_name IS NOT NULL)
    );

COMMIT;
