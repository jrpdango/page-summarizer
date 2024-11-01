export const createJob = ({ db, res, url, status }) => {
    const uuid = crypto.randomUUID();
    db.run('INSERT INTO jobs (uuid, link, req_status) VALUES ($uuid, $url, $status)', { $uuid: uuid, $url: url, $status: status }, function(err) {
        if(err) {
            // Error inserting to DB
            res.send({
                uuid: uuid,
                url,
                status: 'failed',
                error: 'Failed to save job to DB'
            });
            throw err;
        }
        res.send({
            uuid: uuid,
            url,
            status: 'pending'
        });
    });
    return uuid;
};