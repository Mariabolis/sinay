ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

CREATE TABLE IF NOT EXISTS settings (
    key   VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES
    ('shipping_fee', '60')
ON CONFLICT (key) DO NOTHING;
