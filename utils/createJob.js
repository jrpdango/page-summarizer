export const createJob = ({ db, res, url, status, errorMessage }) => {
    const uuid = crypto.randomUUID();
    db.run('INSERT INTO jobs (uuid, link, req_status, error_message) VALUES ($uuid, $url, $status, $errorMessage)', { $uuid: uuid, $url: url, $status: status, $errorMessage: errorMessage }, function(err) {
        if(err) {
            // Error inserting to DB
            res.status(500).send({
                uuid: uuid,
                url,
                status: 'failed',
                error: 'Failed to save job to DB'
            });
        }
        if(status === 'failed') {
            res.status(400).send({
                uuid: uuid,
                status: 'failed',
                error: errorMessage
            });
            return;
        }
        res.send({
            uuid: uuid,
            url,
            status: 'pending'
        });
    });
    return uuid;
};