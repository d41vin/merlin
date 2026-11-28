CREATE TABLE docs_files (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    docs_root_id TEXT NOT NULL REFERENCES docs_roots(id) ON DELETE CASCADE,
    relative_path TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('markdown', 'mdx', 'file')),
    size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
    modified_at TEXT,
    file_identity TEXT,
    content_hash TEXT,
    encoding TEXT NOT NULL CHECK (encoding IN ('utf-8', 'utf-8-bom', 'unsupported', 'unreadable')),
    features_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL CHECK (status IN ('present', 'missing', 'too_large', 'invalid_encoding', 'unsupported_link', 'unreadable')),
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (docs_root_id, relative_path)
);

CREATE INDEX docs_files_project_path_idx
    ON docs_files(project_id, relative_path);

CREATE INDEX docs_files_project_modified_idx
    ON docs_files(project_id, modified_at DESC);

CREATE INDEX docs_files_hash_idx
    ON docs_files(content_hash)
    WHERE content_hash IS NOT NULL;

CREATE TABLE docs_manifest_state (
    docs_root_id TEXT PRIMARY KEY REFERENCES docs_roots(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    scanned_at TEXT NOT NULL,
    file_count INTEGER NOT NULL CHECK (file_count >= 0),
    updated_at TEXT NOT NULL
);
