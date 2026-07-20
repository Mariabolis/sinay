ALTER TABLE coupons
    ADD COLUMN IF NOT EXISTS discount_category    VARCHAR(20)  NOT NULL DEFAULT 'order',
    ADD COLUMN IF NOT EXISTS applies_to_products  JSONB,
    ADD COLUMN IF NOT EXISTS buy_quantity          INT,
    ADD COLUMN IF NOT EXISTS buy_product_ids       JSONB,
    ADD COLUMN IF NOT EXISTS get_quantity          INT,
    ADD COLUMN IF NOT EXISTS get_product_ids       JSONB,
    ADD COLUMN IF NOT EXISTS get_discount_percent  NUMERIC(5,2);
