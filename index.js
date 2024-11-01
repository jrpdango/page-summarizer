import express from 'express';
import 'dotenv/config';
import sqlite3 from 'sqlite3';
import puppeteer from 'puppeteer';
import { summarize } from './services/ai.js';
import { setJobStatus } from './utils/setJobStatus.js';
import { createJob } from './utils/createJob.js';

const app = express();
app.use(express.json());
const port = 3000;

const db = new sqlite3.Database('db/data.db');
const browser = await puppeteer.launch();

app.post('/', async (req, res) => {
    const url = req.body.url;
    if(!url) {
        // TODO: Create Job class
        createJob({
            db,
            res,
            status: 'failed',
            errorMessage: 'POST body must have a "url" property'
        });
        return;
    }

    try {
        const urlObj = new URL(url);
        if(urlObj.hostname !== 'www.lifewire.com') {
            createJob({
                db,
                res,
                url,
                status: 'failed',
                errorMessage: 'For the purposes of this demo, only Lifewire articles are supported.'
            });
            return;
        }
    } catch (error) {
        createJob({
            db,
            res,
            url,
            status: 'failed',
            errorMessage: 'Invalid URL'
        });
        return;
    }

    const lastInsertedUUID = createJob({
        db,
        res,
        url,
        status: 'pending'
    });
    
    const page = await browser.newPage();
    await page.goto(url);

    let article; 
    try {
        article = await page.waitForSelector('.article-content');
    } catch(error) {
        setJobStatus({
            db,
            uuid: lastInsertedUUID,
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
            uuid: lastInsertedUUID,
            status: 'failed',
            result: 'Failed to fetch AI response'
        });
        return;
    }

    setJobStatus({
        db,
        uuid: lastInsertedUUID,
        status: 'completed',
        result: aiResponse.response.text()
    });

    console.log('Job done');
});

app.get('/', (req, res) => {
    const uuid = req.query.uuid;

    if(!uuid) {
        res.status(400).send('Error: No uuid query param provided');
        return;
    }

    db.get('SELECT id, link, result, req_status, error_message FROM jobs WHERE uuid = $uuid', {
        $uuid: uuid
    }, (err, row) => {
        if(err || !row) {
            // Error retrieving from DB
            res.status(400).send({
                error: 'Failed to retrieve job from DB. Try checking if the provided UUID is correct'
            });
            return;
        }
        if(row.error_message) {
            res.send({
                uuid,
                url: row.link,
                result: row.result,
                status: row.req_status,
                error: row.error_message
            });
            return;
        }
        res.send({
            uuid,
            url: row.link,
            result: row.result,
            status: row.req_status,
        });
    });
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});