ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_check;

ALTER TABLE orders
    ADD CONSTRAINT orders_pickup_time_required_check
    CHECK (order_type <> 'PICKUP' OR pickup_time IS NOT NULL);
