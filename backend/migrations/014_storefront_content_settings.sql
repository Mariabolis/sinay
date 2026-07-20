-- Storefront content that was previously hardcoded in the frontend, now
-- editable from /admin/settings: product style labels, the homepage
-- builder's color palette, care-instruction labels, and shipping/returns
-- policy copy shown on the product page.
INSERT INTO settings (key, value) VALUES
    ('product_styles', '{
        "top": [
            {"key":"classic_short_sleeve","label":"Short-sleeve"},
            {"key":"sleeveless","label":"Sleeveless"},
            {"key":"relaxed_shirt","label":"Relaxed shirt"}
        ],
        "bottom": [
            {"key":"shorts","label":"Shorts"},
            {"key":"bermuda","label":"Bermuda"},
            {"key":"wide_leg","label":"Wide-leg"}
        ]
    }'),
    ('store_colors', '[
        {"hex":"#EBCFD2","name":"Dusty Pink"},
        {"hex":"#B9C0AE","name":"Sage"},
        {"hex":"#C9D8E8","name":"Sky Blue"},
        {"hex":"#8B7568","name":"Mocha"}
    ]'),
    ('care_icon_labels', '["Hand wash cold","Gentle cycle","Do not tumble dry","Low heat iron"]'),
    ('shipping_returns_copy', '{
        "free_shipping":"Free standard shipping on orders over EGP 900.",
        "delivery":"Delivered within 3–5 business days across Egypt.",
        "express":"Express delivery available at checkout (Cairo & Giza).",
        "returns":"Returns accepted within 14 days, unworn and in original packaging. Contact us via WhatsApp or email to initiate a return."
    }')
ON CONFLICT (key) DO NOTHING;
