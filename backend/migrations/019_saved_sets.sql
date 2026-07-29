CREATE TABLE IF NOT EXISTS saved_sets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  top_variant_id    UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  bottom_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, top_variant_id, bottom_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_sets_user_id ON saved_sets(user_id);
