import express from 'express';
import 'dotenv/config';
import sqlite3 from 'sqlite3';
import puppeteer from 'puppeteer';
import { JobHandler } from './handlers/job.handler.js';

const app = express();
app.use(express.json());
const port = 3000;

const db = new sqlite3.Database('db/data.db');
db.run(`
CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY,
    uuid TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    url TEXT,
    result TEXT,
    req_status TEXT,
    error_message TEXT
)
`);

/* 
Optional, you can remove this line and remove data.db-shm and data.db-wal
if you want to, but you may encounter more `SQLITE_READONLY: attempt to write a readonly database` errors
*/  
// db.run('PRAGMA journal_mode = WAL');

// Default behavior, run this line if you want to revert from WAL mode
// db.run('PRAGMA journal_mode = DELETE');

const browser = await puppeteer.launch();
const jobHandler = new JobHandler(db, browser);

app.post('/', async (req, res) => {
    await jobHandler.createJob(req, res);
});

app.get('/', (req, res) => {
    jobHandler.getJob(req, res, db);
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});