CREATE TABLE jobs (
    id INTEGER PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    result TEXT,
    is_completed BOOLEAN NOT NULL,
    is_error BOOLEAN NOT NULL
);