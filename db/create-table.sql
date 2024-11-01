CREATE TABLE jobs (
    id INTEGER PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    result TEXT,
    req_status TEXT
);