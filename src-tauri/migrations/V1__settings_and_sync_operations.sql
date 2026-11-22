CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE sync_operations (
    operation_id TEXT PRIMARY KEY,
    source_side TEXT NOT NULL CHECK (source_side IN ('repository', 'backup')),
    destination_side TEXT NOT NULL CHECK (destination_side IN ('repository', 'backup')),
    source_path TEXT NOT NULL,
    destination_path TEXT NOT NULL,
    staging_path TEXT NOT NULL,
    snapshot_path TEXT NOT NULL,
    baseline_hash TEXT NOT NULL CHECK (length(baseline_hash) = 64),
    expected_source_hash TEXT NOT NULL CHECK (length(expected_source_hash) = 64),
    expected_destination_hash TEXT NOT NULL CHECK (length(expected_destination_hash) = 64),
    intended_result_hash TEXT NOT NULL CHECK (length(intended_result_hash) = 64),
    repository_context TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN (
        'prepared',
        'staged',
        'replacing',
        'verified',
        'committed',
        'recovery_required'
    )),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX sync_operations_incomplete_idx
    ON sync_operations(state)
    WHERE state != 'committed';
