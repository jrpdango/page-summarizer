import express from 'express';
import 'dotenv/config';
import sqlite3 from 'sqlite3';
import puppeteer from 'puppeteer';
import { summarize } from './services/ai.js';
import { Job } from './utils/job.js';
import { statusType } from './constants.js';
import { handleError } from './utils/handleError.js';
import { scrapePage } from './utils/scrapePage.js';
import { getJobHandler } from './handlers/getJobHandler.js';

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
    } catch (error) {
        handleError({
            message: error.message, // "Invalid URL"
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
    
    let text;
    try {
        text = await scrapePage({ browser, url });
    } catch (error) {
        console.error(`Puppeteer error: ${error.message}`);
        job.update({ 
            status: statusType.FAILED,
            errorMessage: 'Failed to retrieve text content'
        });
        return;
    }

    let aiResponse;
    try {
        aiResponse = await summarize(text);

    } catch(error) {
        console.error(`AI service error: ${error.message}`);
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
    getJobHandler(req, res, db);
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});