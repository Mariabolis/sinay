-- Add style column that was missing from the initial schema.
-- Applied before the seed so the NOT NULL constraint is safe on an empty table.
ALTER TABLE products ADD COLUMN IF NOT EXISTS style VARCHAR(30) NOT NULL DEFAULT '';
ALTER TABLE products ALTER COLUMN style DROP DEFAULT;
