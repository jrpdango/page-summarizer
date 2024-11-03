import express from 'express';
import 'dotenv/config';
import sqlite3 from 'sqlite3';
import puppeteer from 'puppeteer';
import { getJobHandler } from './handlers/getJobHandler.js';
import { JobController } from './handlers/job.controller.js';

const app = express();
app.use(express.json());
const port = 3000;

const db = new sqlite3.Database('db/data.db');
const browser = await puppeteer.launch();
const jobController = new JobController(db, browser);

app.post('/', async (req, res) => {
    await jobController.createJob(req, res);
});

app.get('/', (req, res) => {
    getJobHandler(req, res, db);
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});