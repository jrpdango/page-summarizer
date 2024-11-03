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
db.run('PRAGMA journal_mode = WAL');
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