import express from 'express';
import 'dotenv/config';
import sqlite3 from 'sqlite3';
import puppeteer from 'puppeteer';
import { summarize } from './services/ai.js';
import { setJobStatus } from './utils/setJobStatus.js';
import { Job } from './utils/job.js';
import { statusType } from './constants.js';
import { handleError } from './utils/handleError.js';

const app = express();
app.use(express.json());
const port = 3000;

const db = new sqlite3.Database('db/data.db');
const browser = await puppeteer.launch();

app.post('/', async (req, res) => {
    const url = req.body.url;
    const job = new Job({ db, url });

    if(!url) {
        handleError({
            message: 'POST body must have a "url" property',
            res,
            job
        });
        return;
    }

    try {
        const urlObj = new URL(url);
        if(urlObj.hostname !== 'www.lifewire.com') {
            handleError({
                message: 'For the purposes of this demo, only Lifewire articles are supported.',
                res,
                job
            });
            return;

        }
    } catch (e) {
        handleError({
            message: 'Invalid URL',
            res,
            job
        });
        return;
    }

    const lastInsertedUUID = job.insertToDb({ status: statusType.PENDING });
    res.send({
        uuid: job.uuid,
        url,
        status: statusType.PENDING
    });
    
    const page = await browser.newPage();
    await page.goto(url);

    let article; 
    try {
        article = await page.waitForSelector('.article-content');
    } catch(error) {
        job.update({ 
            status: statusType.FAILED,
            errorMessage: 'Failed to retrieve text content'
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