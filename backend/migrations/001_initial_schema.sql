-- USERS
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255),
  phone         VARCHAR(50),
  role          VARCHAR(20) NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ADDRESSES
CREATE TABLE IF NOT EXISTS addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  label       VARCHAR(50),
  full_name   VARCHAR(255),
  phone       VARCHAR(50),
  governorate VARCHAR(100),
  city        VARCHAR(100),
  street      VARCHAR(255),
  building    VARCHAR(100),
  notes       VARCHAR(255),
  is_default  BOOLEAN DEFAULT false
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         VARCHAR(255) UNIQUE NOT NULL,
  name         VARCHAR(255) NOT NULL,
  type         VARCHAR(20) NOT NULL,
  description  TEXT,
  fabric       VARCHAR(100),
  care_notes   TEXT,
  base_price   NUMERIC(10,2) NOT NULL,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PRODUCT VARIANTS
CREATE TABLE IF NOT EXISTS product_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
  color_name      VARCHAR(50) NOT NULL,
  color_hex       VARCHAR(7)  NOT NULL,
  size            VARCHAR(10) NOT NULL,
  sku             VARCHAR(100) UNIQUE NOT NULL,
  price_override  NUMERIC(10,2),
  stock_quantity  INT NOT NULL DEFAULT 0,
  UNIQUE(product_id, color_name, size)
);

-- PRODUCT IMAGES
CREATE TABLE IF NOT EXISTS product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  url         VARCHAR(500) NOT NULL,
  position    INT DEFAULT 0
);

-- CARTS
CREATE TABLE IF NOT EXISTS carts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id  VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id      UUID REFERENCES carts(id) ON DELETE CASCADE,
  variant_id   UUID REFERENCES product_variants(id),
  quantity     INT NOT NULL DEFAULT 1,
  set_id       UUID,
  unit_price   NUMERIC(10,2) NOT NULL
);

-- COUPONS
CREATE TABLE IF NOT EXISTS coupons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         VARCHAR(50) UNIQUE NOT NULL,
  type         VARCHAR(20) NOT NULL,
  value        NUMERIC(10,2) NOT NULL,
  active       BOOLEAN DEFAULT true,
  expires_at   TIMESTAMPTZ
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  address_id    UUID REFERENCES addresses(id),
  status        VARCHAR(30) NOT NULL DEFAULT 'pending',
  subtotal      NUMERIC(10,2) NOT NULL,
  discount      NUMERIC(10,2) DEFAULT 0,
  shipping_fee  NUMERIC(10,2) DEFAULT 0,
  total         NUMERIC(10,2) NOT NULL,
  coupon_code   VARCHAR(50),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  variant_id   UUID REFERENCES product_variants(id),
  set_id       UUID,
  quantity     INT NOT NULL,
  unit_price   NUMERIC(10,2) NOT NULL
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID REFERENCES orders(id) ON DELETE CASCADE,
  provider          VARCHAR(30) NOT NULL DEFAULT 'paymob',
  paymob_order_id   VARCHAR(100),
  transaction_id    VARCHAR(100),
  status            VARCHAR(30) NOT NULL DEFAULT 'initiated',
  amount            NUMERIC(10,2) NOT NULL,
  raw_callback      JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
