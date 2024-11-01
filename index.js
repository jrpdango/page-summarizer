import express from 'express';
const app = express();
const port = 3000;

app.post('/', (req, res) => {
    const url = req.body?.url;
    if(!url) {
        res.status(400).send('Error: POST body must have a "url" property.');
    }
    res.send(url);
});

app.get('/', (req, res) => {
    res.send('Initial');
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});