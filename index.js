import express from 'express';
import 'dotenv/config';
import sqlite3 from 'sqlite3';
import puppeteer from 'puppeteer';
import { summarize } from './services/ai.js';
import { setJobStatus } from './utils/setJobStatus.js';

const app = express();
app.use(express.json());
const port = 3000;

const db = new sqlite3.Database('db/data.db');
const browser = await puppeteer.launch();

app.post('/', async (req, res) => {
    const url = req.body.url;
    if(!url) {
        res.status(400).send('Error: POST body must have a "url" property.');
    }

    let lastInsertedId;
    db.run('INSERT INTO jobs (req_status) VALUES ("pending")', function(err) {
        lastInsertedId = this.lastID;
        if(err) {
            // Error inserting to DB
            res.send({
                id: this.lastID,
                url,
                status: 'failed',
                error: 'Failed to save job to DB'
            });
            return;
        }
        res.send({
            id: this.lastID,
            url,
            status: 'pending'
        });
    });
    
    const page = await browser.newPage();
    await page.goto(url);

    let article; 
    try {
        article = await page.waitForSelector('.article-content');
    } catch(error) {
        setJobStatus({
            db,
            id: lastInsertedId,
            status: 'failed',
            result: 'Failed to retrieve text content'
        });
        page.close();
        return;
    }
    const text = await article.evaluate(el => el.textContent);
    page.close();

    let aiResponse;
    try {
        aiResponse = await summarize(text);

    } catch(error) {
        setJobStatus({
            db,
            id: lastInsertedId,
            status: 'failed',
            result: 'Failed to fetch AI response'
        });
        return;
    }

    setJobStatus({
        db,
        id: lastInsertedId,
        status: 'completed',
        result: aiResponse.response.text()
    });

    console.log('Job done');
});

app.get('/', (req, res) => {
    const id = req.query.id;

    if(!id) {
        res.status(400).send('Error: No id query param provided');
        return;
    }

    db.get('SELECT id, result, req_status FROM jobs WHERE id = $id', {
        $id: id
    }, (err, row) => {
        if(err || !row) {
            // Error retrieving from DB
            res.status(400).send({
                error: 'Failed to retrieve job from DB. Try checking if the provided ID is correct'
            });
            return;
        }
        res.send({
            id,
            result: row.result,
            status: row.req_status
        });
    });
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});