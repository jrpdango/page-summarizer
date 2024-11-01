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

    try {
        const urlObj = new URL(url);
        if(urlObj.hostname !== 'www.lifewire.com') {
            res.status(400).send('For the purposes of this demo, only Lifewire articles are supported.');
            return;
        }
    } catch (error) {
        res.status(400).send('Error: invalid URL');
        return;
    }
    
    if(!url) {
        res.status(400).send('Error: POST body must have a "url" property.');
        return;
    }

    const uuid = crypto.randomUUID();
    db.run('INSERT INTO jobs (uuid, link, req_status) VALUES ($uuid, $url, "pending")', { $uuid: uuid, $url: url }, function(err) {
        if(err) {
            // Error inserting to DB
            res.send({
                uuid: uuid,
                url,
                status: 'failed',
                error: 'Failed to save job to DB'
            });
            return;
        }
        res.send({
            uuid: uuid,
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
            uuid: uuid,
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
            uuid: uuid,
            status: 'failed',
            result: 'Failed to fetch AI response'
        });
        return;
    }

    setJobStatus({
        db,
        uuid: uuid,
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

    db.get('SELECT id, link, result, req_status FROM jobs WHERE uuid = $uuid', {
        $uuid: uuid
    }, (err, row) => {
        if(err || !row) {
            // Error retrieving from DB
            res.status(400).send({
                error: 'Failed to retrieve job from DB. Try checking if the provided UUID is correct'
            });
            return;
        }
        res.send({
            uuid,
            url: row.link,
            result: row.result,
            status: row.req_status
        });
    });
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});