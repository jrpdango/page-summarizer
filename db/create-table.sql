CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY,
    uuid TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    url TEXT,
    result TEXT,
    req_status TEXT,
    error_message TEXT
);