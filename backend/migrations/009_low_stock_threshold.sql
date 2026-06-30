INSERT INTO settings (key, value)
VALUES ('low_stock_threshold', '5')
ON CONFLICT (key) DO NOTHING;
