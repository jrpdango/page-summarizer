CREATE TABLE jobs (
    id INTEGER PRIMARY KEY,
    uuid TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    link TEXT,
    result TEXT,
    req_status TEXT
);