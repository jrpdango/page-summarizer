import express from 'express';
import 'dotenv/config';
import sqlite3 from 'sqlite3';
import puppeteer from 'puppeteer';
import { summarize } from './services/ai.js';
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

    // Check if url hasn't been provided
    if(!url) {
        handleError({
            message: 'POST body must have a "url" property',
            res,
            job
        });
        return;
    }

    // Check if url from Lifewire or is invalid
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

    job.insertToDb({ status: statusType.PENDING });
    res.send({
        uuid: job.uuid,
        url,
        status: statusType.PENDING
    });
    
    const page = await browser.newPage();
    await page.goto(url);

    let article; 
    try {
        // Lifewire uses this class on the article itself,
        // so we can get that instead of the entire page's body
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
        job.update({
            status: statusType.FAILED,
            errorMessage: 'Failed to fetch AI response'
        });
        return;
    }

    job.update({
        status: statusType.COMPLETED,
        result: aiResponse.response.text()
    });

    console.log(`${new Date().toLocaleString()} - Job ${job.uuid} done`);
});

app.get('/', (req, res) => {
    const uuid = req.query.uuid;

    // Check if UUID hasn't been provided
    if(!uuid) {
        handleError({ message: 'No uuid query param provided', res });
        return;
    }

    db.get('SELECT id, link, result, req_status, error_message FROM jobs WHERE uuid = $uuid', {
        $uuid: uuid
    }, (err, row) => {
        if(err || !row) {
            // Error retrieving from DB
            handleError({
                message: 'Failed to retrieve job from DB. Try checking if the provided UUID is correct',
                res
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