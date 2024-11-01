import express from 'express';
import 'dotenv/config';
import sqlite3 from 'sqlite3';
import puppeteer from 'puppeteer';

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
    db.run('INSERT INTO jobs (is_completed, is_error) VALUES (FALSE, FALSE)', function(err) {
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

    console.log(text);
});

app.get('/', (req, res) => {
    res.send('Initial');
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});