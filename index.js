import express from 'express';
import 'dotenv/config';
import sqlite3 from 'sqlite3';
import puppeteer from 'puppeteer';
import { summarize } from './services/ai.js';

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
    db.run('INSERT INTO jobs (is_completed, is_error) VALUES (FALSE, FALSE)', function(err) {
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
    const article = await page.waitForSelector('.article-content');
    const text = await article.evaluate(el => el.textContent);

    let aiResponse;
    try {
        aiResponse = await summarize(text);

    } catch(error) {
        db.run('UPDATE jobs SET (result, is_completed, is_error) = ($result, TRUE, TRUE) WHERE id = $id', {
            $result: 'Failed to fetch AI response',
            $id: lastInsertedId
        });
        return;
    }

    db.run('UPDATE jobs SET (result, is_completed) = ($result, TRUE) WHERE id = $id', {
        $result: aiResponse.response.text(),
        $id: lastInsertedId
    });

    console.log(aiResponse.response.text());
});

app.get('/', (req, res) => {
    res.send('Initial');
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});