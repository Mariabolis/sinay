# Phase: Admin Dashboard

## Goal
Build a complete admin interface for managing products, orders, inventory, and customers — replacing manual database/Cursor edits with a real UI.

## Prerequisite
Cloudinary account setup (image hosting) — decided, not yet implemented.

## Sub-phases (in build order)

### 1. Admin Auth & Layout
- Reuse existing JWT auth, add `role` field to `users` table (`customer` | `admin`)
- Protected `/admin` routes (middleware checks role)
- Admin shell: sidebar nav, top bar, branded with SINAY tokens

### 2. Cloudinary Integration
- Backend: Cloudinary Go SDK, upload endpoint `/api/admin/upload`
- Frontend: drag-and-drop image uploader component (replaces URL-paste field)
- Store returned Cloudinary URL in `products` / `product_images` table

### 3. Product CRUD
- List view: table with style, color, size, stock, price, image thumbnail
- Create/Edit form: all product fields + multi-image upload via Cloudinary
- Delete with confirmation
- Bulk actions (optional): bulk price update, bulk stock update

### 4. Orders Management
- List view: order ID, customer, total, payment_method, status, date — filterable by status/date/payment method
- Order detail view: items, shipping address, customer info, payment status
- Manual status update (Pending → Processing → Shipped → Delivered → Cancelled)
- Search by order ID / customer phone

### 5. Inventory Tracking
- Stock count per variant (style + color + size)
- Low-stock threshold alert (configurable, e.g. <5 units)
- Auto-disable "Add to Cart" on storefront when stock = 0

### 6. Admin Notifications
- New order → in-app notification (bell icon, unread count)
- Low stock → in-app notification
- Stretch: optional email digest to admin email

### 7. Customer Management
- List of registered users, order count, total spend, join date
- View individual customer's order history

### 8. Activity Log
- Track: who changed what (order status, product edit, stock update) and when
- Simple table: `activity_logs` (admin_id, action, target_type, target_id, timestamp, details JSON)

### 9. Analytics (basic)
- Total revenue (filterable by date range)
- Best-selling products/styles
- Orders by status breakdown
- Simple charts (recharts)

### 10. Discount Codes
- CRUD for codes: percentage or flat discount, expiry date, usage limit
- Applied at checkout via code field

### 11. Content Management (stretch)
- Edit homepage banner text/images without code changes
- Simple key-value content table

## Database changes needed
- `users.role` (enum: customer, admin)
- `activity_logs` table (new)
- `settings` table additions: low_stock_threshold
- `discount_codes` table (new)

## Tech notes
- Frontend: new `/admin` route tree in existing React app, separate layout from storefront
- Reuse Zustand for admin state where useful
- Keep admin UI visually distinct from customer-facing brand (functional, dense, not "made to feel like you" styling)
