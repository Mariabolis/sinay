-- Size guide measurements, editable from /admin/settings instead of hardcoded
-- in the frontend. Stored as JSON arrays of {size, ...measurements}.
INSERT INTO settings (key, value) VALUES
    ('size_guide_tops', '[
        {"size":"S","chest":"84–88","length":"62","shoulder":"37"},
        {"size":"M","chest":"88–92","length":"64","shoulder":"39"},
        {"size":"L","chest":"92–96","length":"66","shoulder":"41"},
        {"size":"XL","chest":"96–102","length":"68","shoulder":"43"}
    ]'),
    ('size_guide_bottoms', '[
        {"size":"S","waist":"64–68","hip":"90–94","inseam":"28"},
        {"size":"M","waist":"68–72","hip":"94–98","inseam":"29"},
        {"size":"L","waist":"72–76","hip":"98–104","inseam":"30"},
        {"size":"XL","waist":"76–82","hip":"104–110","inseam":"31"}
    ]')
ON CONFLICT (key) DO NOTHING;
