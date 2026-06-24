CREATE TABLE IF NOT EXISTS shipping_zones (
    governorate VARCHAR(100) PRIMARY KEY,
    fee         NUMERIC(10,2) NOT NULL DEFAULT 75
);

INSERT INTO shipping_zones (governorate, fee) VALUES
    ('Cairo',          60),
    ('Giza',           60),
    ('Qalyubia',       60),
    ('Alexandria',     65),
    ('Dakahlia',       75),
    ('Beheira',        75),
    ('Gharbiya',       75),
    ('Menofia',        75),
    ('Sharkia',        75),
    ('Damietta',       75),
    ('Kafr El Sheikh', 75),
    ('Port Said',      75),
    ('Ismailia',       75),
    ('Suez',           75),
    ('Fayoum',         80),
    ('Beni Suef',      80),
    ('Minya',          85),
    ('Assiut',         90),
    ('Sohag',          90),
    ('Qena',           90),
    ('Luxor',          90),
    ('Aswan',          95),
    ('Red Sea',        100),
    ('North Sinai',    100),
    ('South Sinai',    100),
    ('New Valley',     100),
    ('Matruh',         100)
ON CONFLICT (governorate) DO NOTHING;
