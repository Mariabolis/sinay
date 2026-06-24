CREATE TABLE IF NOT EXISTS ready_sets (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255) NOT NULL,
    top_variant_id    UUID        NOT NULL REFERENCES product_variants(id),
    bottom_variant_id UUID        NOT NULL REFERENCES product_variants(id),
    price             NUMERIC(10,2) NOT NULL,
    is_active         BOOLEAN     NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
