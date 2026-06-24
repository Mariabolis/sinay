# SINAY Sleepwear — Full Project Specification

**Stack:** React (frontend) + Go (backend) + PostgreSQL
**Core feature:** Mix & Match sleepwear builder — customer picks a top and a bottom independently, in different colors/patterns, and checks out as one outfit.
**Payment:** Paymob (account already provisioned)
**Language:** English only (all UI copy, emails, admin)
**Auth policy:** Registration is required before checkout — no guest checkout. Browsing the catalog and the Mix & Match builder is open to everyone; the cart can be built without an account, but checkout is blocked until the customer registers/logs in.
**Shipping:** Not finalized yet. Built with a single flat placeholder fee (editable later) until Maria decides between flat-rate vs per-governorate pricing — see §10.
**Brand concept:** SINAY is a Korean-inspired loungewear brand. Comfort should feel personal — instead of a fixed pajama set, every piece is designed to be mixed and matched. Customers choose a **top style** (classic short-sleeve / sleeveless / relaxed shirt), pair it with a **bottom style** (shorts / bermuda shorts / wide-leg pants), then pick a color — producing dozens of combinations from a small curated collection. Tagline: *"Mix. Match. Make it yours."*

---

## 1. Brand Tokens (from brand sheet)

Use these everywhere — Tailwind config, Figma, emails, packaging-matching UI.

```js
// brand tokens
const colors = {
  cream:     '#F4EEE8', // primary background
  dustyPink: '#EBCFD2', // primary accent / CTA
  sage:      '#B9C0AE', // secondary accent
  skyBlue:   '#C9D8E8', // secondary accent
  mocha:     '#8B7568', // text / logo / dark accent
};

const fonts = {
  logo: 'a wide-tracked serif (e.g. "Cormorant", "Playfair Display")',
  body: 'a soft humanist sans (e.g. "Quicksand", "Nunito")',
};

const tagline = "made to feel like you";
const microCopy = [
  "soft, comfy & yours",
  "for slow mornings & easy nights",
  "lightweight & breathable",
  "super soft",
  "made for comfort",
  "all day comfort",
  "mix & match your way",
];

const sizes = ["S", "M", "L", "XL"];
```

Use the wave icon (≈) as a recurring motif: loaders, dividers, favicon, empty states.

---

## 2. Information Architecture

```
/                      → Home (hero, "build your set" CTA, new in, reviews)
/shop                  → All products grid (filter: type, color, size)
/shop/tops             → Tops only
/shop/bottoms          → Bottoms only
/build-your-set        → Mix & Match builder (core feature)
/product/:slug         → Single product detail
/cart
/checkout
/order/:id/confirmation
/account                → orders, addresses, saved sets
/about
/admin/*               → protected dashboard (products, orders, coupons)
```

---

## 3. Mix & Match Data Model (the important part)

Key decision: **tops and bottoms are separate, independently-purchasable products**, each with its own variants (color × size). The "Mix & Match" builder is a *frontend composition layer* on top of normal commerce — it lets the user select one top variant + one bottom variant and adds **two cart line items** tagged with a shared `set_id` (a uuid generated client-side or server-side at add-to-cart time). This keeps the backend simple (standard cart/order/inventory logic) while still letting you:

- show "your set" as a single visual card in cart/checkout
- give automatic set discounts (e.g. "buy a top + bottom, save 10%")
- track which combos are popular (analytics on `set_id` pairs)

---

## 4. Database Schema (PostgreSQL)

```sql
-- SETTINGS  (key-value store the owner can edit without a code change — e.g. shipping fee)
CREATE TABLE settings (
  key          VARCHAR(100) PRIMARY KEY,
  value        VARCHAR(255) NOT NULL
);
-- seeded with: ('shipping_flat_fee', '0')

-- USERS
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255),
  phone         VARCHAR(50),
  role          VARCHAR(20) NOT NULL DEFAULT 'customer', -- customer | admin
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ADDRESSES
CREATE TABLE addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  label       VARCHAR(50),        -- home, work
  full_name   VARCHAR(255),
  phone       VARCHAR(50),
  governorate VARCHAR(100),
  city        VARCHAR(100),
  street      VARCHAR(255),
  building    VARCHAR(100),
  notes       VARCHAR(255),
  is_default  BOOLEAN DEFAULT false
);

-- PRODUCTS  (a "top" or a "bottom" — the buildable unit)
CREATE TABLE products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         VARCHAR(255) UNIQUE NOT NULL,
  name         VARCHAR(255) NOT NULL,
  type         VARCHAR(20) NOT NULL,         -- 'top' | 'bottom' | 'set' (pre-bundled, optional)
  style        VARCHAR(30) NOT NULL,         -- top: classic_short_sleeve | sleeveless | relaxed_shirt
                                              -- bottom: shorts | bermuda | wide_leg
  description  TEXT,
  fabric       VARCHAR(100),                 -- e.g. "double gauze cotton"
  care_notes   TEXT,
  base_price   NUMERIC(10,2) NOT NULL,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PRODUCT VARIANTS (color × size = sellable unit, has its own stock + SKU)
CREATE TABLE product_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
  color_name      VARCHAR(50) NOT NULL,       -- "dusty pink"
  color_hex       VARCHAR(7)  NOT NULL,       -- "#EBCFD2"
  size            VARCHAR(10) NOT NULL,       -- S, M, L, XL
  sku             VARCHAR(100) UNIQUE NOT NULL,
  price_override  NUMERIC(10,2),              -- null = use product.base_price
  stock_quantity  INT NOT NULL DEFAULT 0,
  UNIQUE(product_id, color_name, size)
);

-- PRODUCT IMAGES
CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES product_variants(id) ON DELETE CASCADE, -- nullable: image may be color-specific
  url         VARCHAR(500) NOT NULL,
  position    INT DEFAULT 0
);

-- CARTS
CREATE TABLE carts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL, -- nullable while browsing/building cart pre-signup
  session_id  VARCHAR(255),                                  -- tracks anonymous cart before account is created
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id      UUID REFERENCES carts(id) ON DELETE CASCADE,
  variant_id   UUID REFERENCES product_variants(id),
  quantity     INT NOT NULL DEFAULT 1,
  set_id       UUID,        -- shared id linking a top+bottom built together; null if bought alone
  unit_price   NUMERIC(10,2) NOT NULL  -- snapshot at time of add
);

-- COUPONS
CREATE TABLE coupons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         VARCHAR(50) UNIQUE NOT NULL,
  type         VARCHAR(20) NOT NULL,   -- percent | fixed
  value        NUMERIC(10,2) NOT NULL,
  active       BOOLEAN DEFAULT true,
  expires_at   TIMESTAMPTZ
);

-- ORDERS
CREATE TABLE orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  address_id    UUID REFERENCES addresses(id),
  payment_method VARCHAR(20) NOT NULL DEFAULT 'card', -- 'card' (Paymob) | 'cod' (cash on delivery)
  status        VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending|paid|processing|shipped|delivered|cancelled
                                                          -- note: 'cod' orders skip 'pending' and go straight to 'processing' since no online payment is collected upfront
  subtotal      NUMERIC(10,2) NOT NULL,
  discount      NUMERIC(10,2) DEFAULT 0,
  shipping_fee  NUMERIC(10,2) DEFAULT 0,
  total         NUMERIC(10,2) NOT NULL,
  coupon_code   VARCHAR(50),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  variant_id   UUID REFERENCES product_variants(id),
  set_id       UUID,
  quantity     INT NOT NULL,
  unit_price   NUMERIC(10,2) NOT NULL
);

-- PAYMENTS  (Paymob)
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID REFERENCES orders(id) ON DELETE CASCADE,
  provider          VARCHAR(30) NOT NULL DEFAULT 'paymob',
  paymob_order_id   VARCHAR(100),
  transaction_id    VARCHAR(100),
  status            VARCHAR(30) NOT NULL DEFAULT 'initiated', -- initiated|success|failed|refunded
  amount            NUMERIC(10,2) NOT NULL,
  raw_callback      JSONB,         -- store full webhook payload for audit
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 5. API Endpoints (Go, REST, JSON)

Suggested libs: `gin` (router), `gorm` (ORM), `golang-jwt/jwt` (auth), `validator`.

```
PUBLIC
GET    /api/products                 ?type=top|bottom&style=&color=&size=&page=
GET    /api/products/:slug
GET    /api/colors                   → distinct colors in stock (for filter UI)

AUTH
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/me                  (protected)

CART  (works pre-account via session cookie; merged into user's cart on login/register)
GET    /api/cart
POST   /api/cart/items               { variant_id, quantity, set_id? }
POST   /api/cart/sets                { top_variant_id, bottom_variant_id }  → adds 2 items sharing a new set_id
PUT    /api/cart/items/:id
DELETE /api/cart/items/:id
POST   /api/cart/coupon              { code }

ADDRESSES (protected — requires account)
GET    /api/addresses
POST   /api/addresses
PUT    /api/addresses/:id
DELETE /api/addresses/:id

CHECKOUT (protected — requires account; returns 401 → frontend redirects to /login?redirect=/checkout)
POST   /api/checkout                 { address_id, cart_id, payment_method: 'card' | 'cod' }
                                      → 'card': creates order (status=pending) + Paymob payment key, returns { order_id, paymob_iframe_url }
                                      → 'cod': creates order (status=processing, no Paymob call), returns { order_id }

PAYMENT WEBHOOK (Paymob → your server)
POST   /api/payments/paymob/callback  (HMAC-verified, see §6)

ORDERS (protected)
GET    /api/orders
GET    /api/orders/:id

ADMIN (protected, role=admin)
POST   /api/admin/products
PUT    /api/admin/products/:id        (incl. is_active toggle to deactivate/discontinue)
POST   /api/admin/products/:id/variants
PUT    /api/admin/variants/:id        (stock, price)
GET    /api/admin/orders
GET    /api/admin/orders/:id          (full detail: items, customer name/phone, shipping address — what the owner needs to actually pack and ship)
PUT    /api/admin/orders/:id/status
POST   /api/admin/coupons
GET    /api/admin/customers           (read-only list: name, email, phone, order count — for support/lookup)
GET    /api/admin/dashboard/summary   → { total_revenue, orders_count, orders_today, top_selling_variants[], low_stock_variants[] }
GET    /api/admin/settings            → current key-value settings (e.g. shipping_flat_fee)
PUT    /api/admin/settings/:key       → { value } — lets the owner change shipping fee (and future config) without a code deploy
```

---

## 6. Paymob Integration Flow (for `payment_method = 'card'` only — `'cod'` orders skip this entirely)

Paymob's flow is a 3-step token exchange, then an iframe checkout, then a server-to-server webhook to confirm payment. Implement as `internal/services/payment/paymob.go`:

1. **Authentication request** → `POST https://accept.paymob.com/api/auth/tokens` with your API key → returns `auth_token`.
2. **Order registration** → `POST https://accept.paymob.com/api/ecommerce/orders` with `auth_token`, amount (in cents), and your local `order_id` as `merchant_order_id` → returns Paymob's `id`.
3. **Payment key request** → `POST https://accept.paymob.com/api/acceptance/payment_keys` with billing data, amount, `order_id` (Paymob's), and `integration_id` → returns `token`.
4. Redirect/embed the iframe: `https://accept.paymob.com/api/acceptance/iframes/{IFRAME_ID}?payment_token={token}`.
5. **Webhook callback** on `POST /api/payments/paymob/callback`: Paymob sends transaction result. **Verify the HMAC signature** before trusting it (Paymob docs give the exact concatenation order of fields to hash with your HMAC secret). On success, mark `payments.status = success`, `orders.status = paid`, decrement `stock_quantity`.

Env vars needed:
```
PAYMOB_API_KEY=
PAYMOB_INTEGRATION_ID=
PAYMOB_IFRAME_ID=
PAYMOB_HMAC_SECRET=
```

⚠️ Never trust the client-side redirect alone to mark an order paid — always confirm via the server-side webhook + HMAC check, since redirect URLs can be replayed or forged.

---

## 7. Folder Structure

```
sinay/
├── backend/
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── config/           # env loading
│   │   ├── db/                # gorm setup, migrations runner
│   │   ├── models/            # User, Product, Variant, Cart, Order, Payment...
│   │   ├── handlers/          # http handlers per resource
│   │   ├── middleware/        # auth, cors, logging
│   │   ├── repository/        # db queries
│   │   └── services/
│   │       └── payment/paymob.go
│   ├── migrations/            # .sql files, numbered
│   ├── go.mod
│   └── go.sum
│
├── frontend/
│   ├── src/
│   │   ├── api/                # axios/fetch wrappers per resource
│   │   ├── components/         # Button, Card, ColorSwatch, SizePicker...
│   │   ├── features/
│   │   │   ├── mix-match/      # the builder: TopPicker, BottomPicker, OutfitPreview
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   └── account/
│   │   ├── pages/              # route-level components
│   │   ├── store/              # zustand: cartStore, authStore
│   │   ├── styles/              # tailwind.config.js with brand tokens
│   │   └── App.tsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
└── docs/
    └── this file
```

---

## 8. Build Plan (7 weeks)

| Week | Focus |
|---|---|
| 1 | Repo setup, Postgres + migrations, Go skeleton (Gin + GORM), React + Vite + Tailwind w/ brand tokens, auth (register/login/JWT) |
| 2 | Product catalog: models, seed data, `/api/products`, shop grid + filters in React |
| 3 | **Mix & Match builder**: top/bottom pickers, live outfit preview, "add set to cart" → `/api/cart/sets` |
| 4 | Cart + checkout UI, addresses, coupon logic, order creation |
| 5 | Paymob integration end-to-end (sandbox keys first), webhook + HMAC verification, order status updates |
| 6 | Admin dashboard: products/variants CRUD (name, description, **price**, stock per color+size), order list + status updates, coupon CRUD, and a **sales overview** (revenue, order counts, best-selling variants, low-stock alerts) via `/api/admin/dashboard/summary` |
| 7 | Responsive polish, empty/loading states, email/WhatsApp order confirmation copy, deploy (e.g. Railway/Render for Go API + Postgres, Vercel/Netlify for React), final QA on real Paymob transaction |

---

## 9. Cursor / Claude Code Prompts (paste these in order)

**Backend bootstrap:**
> "Set up a Go backend using Gin and GORM connected to PostgreSQL. Create the schema from the SQL in section 4 of SINAY-project-spec.md as GORM models in internal/models. Add a migrations runner that applies migrations/*.sql in order on startup."

**Auth:**
> "Implement JWT-based auth in internal/handlers/auth.go: register, login, refresh, and a /api/auth/me endpoint protected by an AuthMiddleware in internal/middleware. Passwords hashed with bcrypt."

**Products + variants:**
> "Implement the product and variant handlers per the API spec in section 5. GET /api/products should support type, color, and size query filters and pagination."

**Mix & Match cart:**
> "Implement POST /api/cart/sets per section 3: it takes top_variant_id and bottom_variant_id, generates a new set_id, and creates two cart_items sharing that set_id. Implement guest cart support via a session_id cookie when no auth token is present."

**Frontend builder UI:**
> "Build a Mix & Match page at /build-your-set using React + Tailwind with the brand tokens in section 1. Left column: TopPicker grid (color swatches + size selector). Right column: BottomPicker, same pattern. Bottom: sticky OutfitPreview bar showing both selections + combined price + 'Add Set to Cart' button calling POST /api/cart/sets."

**Paymob:**
> "Implement internal/services/payment/paymob.go per section 6: GetAuthToken, RegisterOrder, GetPaymentKey, and a VerifyWebhookHMAC function. Wire POST /api/checkout to call these in sequence and return the iframe URL. Implement POST /api/payments/paymob/callback to verify HMAC and update order/payment status."

**Admin:**
> "Build a protected /admin route (role=admin) with: a products table (inline edit for name, price, per-variant stock, a plain image-URL text field per variant — no upload integration yet, just store the pasted URL — and an active/inactive toggle), an orders table (status dropdown: pending/paid/processing/shipped/delivered/cancelled, showing payment_method) that opens a detail view per order with items + customer name/phone + shipping address, a read-only customers list, a coupons section, a settings page to edit the flat shipping fee, and a dashboard overview page showing total revenue, order counts, best-selling variants, and low-stock alerts via GET /api/admin/dashboard/summary."

---

## 10. Notes / Open Decisions for Maria

- ✅ Language: English only — locked.
- ✅ Auth: registration required before checkout, no guest checkout — locked.
- ✅ Cash on Delivery added alongside Paymob card payment — locked.
- ⏳ **Product images in admin** — deferred Cloudinary upload for now to not block the rest of the admin dashboard. Building with a simple image-URL field instead: admin uploads the photo anywhere (Cloudinary's own free dashboard, imgur, etc.) and pastes the link into the product form. Works today, zero extra backend work. Swap in the real upload button (§ below, Cloudinary) as a quick follow-up whenever — it only touches one endpoint and one form field, nothing else depends on it.
- ⏳ Shipping fee logic (flat rate vs by governorate) — still undecided, but the owner can now edit the flat fee value directly from `/admin/settings` without a code deploy (see §5).
- Pre-bundled "sets" (matching top+bottom in one print) are supported by `products.type = 'set'` if you want some fixed combos alongside the free-mix builder.
- Confirm with Paymob whether you're on their **Accept** (card) integration only, or also enabling Fawry/wallet — each has a separate `integration_id`, and checkout can offer multiple methods from one payment key.

---

## 11. Deployment — Going Live

You can do step 1 (domain) any time, in parallel with development. Steps 2–6 happen at the end (Week 7 in §8).

1. **Buy a domain** — Namecheap or GoDaddy both work fine for Egypt-targeted sites; `.com` or `.shop` are simplest. No need for `.com.eg` unless you specifically want it (it requires NTRA registration, more paperwork).

2. **Host the frontend** — push the `frontend/` folder to a GitHub repo, connect it to **Vercel** (or Netlify). It auto-builds and deploys on every push, gives you a free `https://` URL immediately, and you point your custom domain to it later (steps below).

3. **Host the backend + database** — push `backend/` to GitHub, connect to **Railway** (simplest for Go + Postgres together) or Render. Add a Postgres instance there too — it gives you a `DATABASE_URL` automatically.

4. **Set environment variables on each platform's dashboard** (never commit these to git):
   - Backend: `DATABASE_URL`, `JWT_SECRET`, `PAYMOB_API_KEY`, `PAYMOB_INTEGRATION_ID`, `PAYMOB_IFRAME_ID`, `PAYMOB_HMAC_SECRET`, `CORS_ALLOWED_ORIGIN` (your live frontend domain)
   - Frontend: `VITE_API_URL` (your live backend URL)

5. **Point your domain:**
   - Root domain (`sinay.com`) → CNAME/A record to Vercel, per Vercel's "Add Domain" instructions
   - `api.sinay.com` → CNAME to Railway/Render, per their custom-domain instructions
   - Both platforms issue free HTTPS certificates automatically once DNS is pointed

6. **Switch Paymob from test to live mode** — confirm with Paymob support that your integration is approved for live transactions (separate from sandbox), then swap the env vars in step 4 to your live keys.

7. **Final smoke test before announcing publicly:** register a real account, build a real set, run one real small payment end-to-end, confirm the order shows up correctly in the database/admin. Only then share the link.
