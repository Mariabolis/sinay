-- Store contact details shown on the Contact Us page and footer, editable
-- from /admin/settings.
INSERT INTO settings (key, value)
VALUES ('contact_info', '{"email":"sinay.egy@gmail.com","whatsapp":"+20 100 000 0000"}')
ON CONFLICT (key) DO NOTHING;
-- //todo add real values