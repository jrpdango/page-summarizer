export const createJob = ({ db, res, url, status }) => {
    let lastInsertedId;
    db.run('INSERT INTO jobs (link, req_status) VALUES ($url, $status)', { $url: url, $status: status }, function(err) {
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
    return lastInsertedId;
};