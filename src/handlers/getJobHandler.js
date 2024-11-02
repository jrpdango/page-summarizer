import { handleError } from '../utils/handleError.js';

export const getJobHandler = (req, res, db) => {
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
}