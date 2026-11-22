INSERT INTO settings (key, value_json, updated_at) VALUES
    ('app.theme_slug.v1', '"merlin-dark"', strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    ('app.density.v1', '"default"', strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    ('app.accessibility.force_reduced_motion.v1', 'false', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ON CONFLICT(key) DO NOTHING;
