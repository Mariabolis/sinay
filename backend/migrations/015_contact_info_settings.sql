-- Store contact details shown on the Contact Us page and footer, editable
-- from /admin/settings. Seeded with obvious placeholders — replace via the
-- admin panel once real contact details are available.
INSERT INTO settings (key, value)
VALUES ('contact_info', '{"email":"hello@sinay-example.com","whatsapp":"+20 100 000 0000"}')
ON CONFLICT (key) DO NOTHING;
-- //todo add real values