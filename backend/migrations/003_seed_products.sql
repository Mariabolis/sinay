-- Seed catalog: 6 products × 4 colors × 4 sizes = 96 variants.
-- All inserts are idempotent (ON CONFLICT DO NOTHING).

-- ── TOPS ──────────────────────────────────────────────────────────────────────

INSERT INTO products (id, slug, name, type, style, description, fabric, base_price)
VALUES (gen_random_uuid(), 'classic-short-sleeve-top', 'Classic Short-Sleeve Top',
        'top', 'classic_short_sleeve',
        'A relaxed short-sleeve cut in double gauze cotton — soft against the skin and easy to move in.', 'Double gauze cotton', 450.00)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_variants (id, product_id, color_name, color_hex, size, sku, stock_quantity)
SELECT gen_random_uuid(), p.id, c.cn, c.ch, s.sz, 'TOP-CLASSIC-' || c.cd || '-' || s.sz, 20
FROM products p
CROSS JOIN (VALUES
  ('Dusty Pink', '#EBCFD2', 'DUSTY'),
  ('Sage',       '#B9C0AE', 'SAGE'),
  ('Sky Blue',   '#C9D8E8', 'BLUE'),
  ('Mocha',      '#8B7568', 'MOCHA')
) c(cn, ch, cd)
CROSS JOIN (VALUES ('S'), ('M'), ('L'), ('XL')) s(sz)
WHERE p.slug = 'classic-short-sleeve-top'
ON CONFLICT DO NOTHING;

-- ──

INSERT INTO products (id, slug, name, type, style, description, fabric, base_price)
VALUES (gen_random_uuid(), 'sleeveless-top', 'Sleeveless Top',
        'top', 'sleeveless',
        'A sleek sleeveless top that layers beautifully or stands alone on warm nights.', 'Double gauze cotton', 420.00)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_variants (id, product_id, color_name, color_hex, size, sku, stock_quantity)
SELECT gen_random_uuid(), p.id, c.cn, c.ch, s.sz, 'TOP-SLEEVELESS-' || c.cd || '-' || s.sz, 20
FROM products p
CROSS JOIN (VALUES
  ('Dusty Pink', '#EBCFD2', 'DUSTY'),
  ('Sage',       '#B9C0AE', 'SAGE'),
  ('Sky Blue',   '#C9D8E8', 'BLUE'),
  ('Mocha',      '#8B7568', 'MOCHA')
) c(cn, ch, cd)
CROSS JOIN (VALUES ('S'), ('M'), ('L'), ('XL')) s(sz)
WHERE p.slug = 'sleeveless-top'
ON CONFLICT DO NOTHING;

-- ──

INSERT INTO products (id, slug, name, type, style, description, fabric, base_price)
VALUES (gen_random_uuid(), 'relaxed-shirt-top', 'Relaxed Shirt',
        'top', 'relaxed_shirt',
        'An oversized, button-front shirt cut for maximum comfort — great over any bottom.', 'Washed cotton voile', 480.00)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_variants (id, product_id, color_name, color_hex, size, sku, stock_quantity)
SELECT gen_random_uuid(), p.id, c.cn, c.ch, s.sz, 'TOP-RELAXED-' || c.cd || '-' || s.sz, 20
FROM products p
CROSS JOIN (VALUES
  ('Dusty Pink', '#EBCFD2', 'DUSTY'),
  ('Sage',       '#B9C0AE', 'SAGE'),
  ('Sky Blue',   '#C9D8E8', 'BLUE'),
  ('Mocha',      '#8B7568', 'MOCHA')
) c(cn, ch, cd)
CROSS JOIN (VALUES ('S'), ('M'), ('L'), ('XL')) s(sz)
WHERE p.slug = 'relaxed-shirt-top'
ON CONFLICT DO NOTHING;

-- ── BOTTOMS ───────────────────────────────────────────────────────────────────

INSERT INTO products (id, slug, name, type, style, description, fabric, base_price)
VALUES (gen_random_uuid(), 'cotton-shorts', 'Cotton Shorts',
        'bottom', 'shorts',
        'Short and easy, with a soft elastic waist and a smooth double-gauze feel.', 'Double gauze cotton', 360.00)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_variants (id, product_id, color_name, color_hex, size, sku, stock_quantity)
SELECT gen_random_uuid(), p.id, c.cn, c.ch, s.sz, 'BOT-SHORTS-' || c.cd || '-' || s.sz, 20
FROM products p
CROSS JOIN (VALUES
  ('Dusty Pink', '#EBCFD2', 'DUSTY'),
  ('Sage',       '#B9C0AE', 'SAGE'),
  ('Sky Blue',   '#C9D8E8', 'BLUE'),
  ('Mocha',      '#8B7568', 'MOCHA')
) c(cn, ch, cd)
CROSS JOIN (VALUES ('S'), ('M'), ('L'), ('XL')) s(sz)
WHERE p.slug = 'cotton-shorts'
ON CONFLICT DO NOTHING;

-- ──

INSERT INTO products (id, slug, name, type, style, description, fabric, base_price)
VALUES (gen_random_uuid(), 'bermuda-shorts', 'Bermuda Shorts',
        'bottom', 'bermuda',
        'Knee-length with a relaxed fit — the in-between bottom for slow days or quick errands.', 'Double gauze cotton', 380.00)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_variants (id, product_id, color_name, color_hex, size, sku, stock_quantity)
SELECT gen_random_uuid(), p.id, c.cn, c.ch, s.sz, 'BOT-BERMUDA-' || c.cd || '-' || s.sz, 20
FROM products p
CROSS JOIN (VALUES
  ('Dusty Pink', '#EBCFD2', 'DUSTY'),
  ('Sage',       '#B9C0AE', 'SAGE'),
  ('Sky Blue',   '#C9D8E8', 'BLUE'),
  ('Mocha',      '#8B7568', 'MOCHA')
) c(cn, ch, cd)
CROSS JOIN (VALUES ('S'), ('M'), ('L'), ('XL')) s(sz)
WHERE p.slug = 'bermuda-shorts'
ON CONFLICT DO NOTHING;

-- ──

INSERT INTO products (id, slug, name, type, style, description, fabric, base_price)
VALUES (gen_random_uuid(), 'wide-leg-pants', 'Wide-Leg Pants',
        'bottom', 'wide_leg',
        'Floaty wide-leg pants with a high waist — the signature SINAY bottom.', 'Double gauze cotton', 420.00)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_variants (id, product_id, color_name, color_hex, size, sku, stock_quantity)
SELECT gen_random_uuid(), p.id, c.cn, c.ch, s.sz, 'BOT-WIDLEG-' || c.cd || '-' || s.sz, 20
FROM products p
CROSS JOIN (VALUES
  ('Dusty Pink', '#EBCFD2', 'DUSTY'),
  ('Sage',       '#B9C0AE', 'SAGE'),
  ('Sky Blue',   '#C9D8E8', 'BLUE'),
  ('Mocha',      '#8B7568', 'MOCHA')
) c(cn, ch, cd)
CROSS JOIN (VALUES ('S'), ('M'), ('L'), ('XL')) s(sz)
WHERE p.slug = 'wide-leg-pants'
ON CONFLICT DO NOTHING;
