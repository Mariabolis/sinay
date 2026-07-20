-- The ordered list of sizes the store offers, editable from /admin/settings.
-- Product variants still store size as free-text VARCHAR, so this list is
-- purely a UI vocabulary: it drives the size dropdown in the admin product
-- form, the shop filter pills, and the size-guide table rows.
INSERT INTO settings (key, value)
VALUES ('available_sizes', '["S","M","L","XL"]')
ON CONFLICT (key) DO NOTHING;
