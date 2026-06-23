-- Allow a coupon code and a precomputed discount to live on the cart row.
ALTER TABLE carts ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE carts ADD COLUMN IF NOT EXISTS discount    NUMERIC(10,2) NOT NULL DEFAULT 0;
