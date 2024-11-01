import express from 'express';
import 'dotenv/config';
import sqlite3 from 'sqlite3';

const app = express();
app.use(express.json());
const port = 3000;

const db = new sqlite3.Database('db/data.db');

app.post('/', (req, res) => {
    const url = req.body.url;
    if(!url) {
        res.status(400).send('Error: POST body must have a "url" property.');
    }
    db.run('INSERT INTO jobs (is_completed, is_error) VALUES (FALSE, FALSE)');
    res.send(url);
});

app.get('/', (req, res) => {
    res.send('Initial');
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});