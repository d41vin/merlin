CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'passive', 'archived')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE repository_connections (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    canonical_local_path TEXT NOT NULL COLLATE NOCASE UNIQUE,
    remote_identity TEXT COLLATE NOCASE,
    default_branch TEXT,
    last_observed_head TEXT,
    last_observed_branch TEXT,
    connection_status TEXT NOT NULL CHECK (connection_status IN ('connected', 'unavailable', 'disconnected')),
    last_reconciled_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX repository_connections_remote_idx
    ON repository_connections(remote_identity)
    WHERE remote_identity IS NOT NULL;

CREATE TABLE docs_roots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    root_kind TEXT NOT NULL CHECK (root_kind IN ('repository', 'project_store')),
    relative_path TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'skipped', 'missing')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (root_kind <> 'repository' OR length(relative_path) > 0)
);
