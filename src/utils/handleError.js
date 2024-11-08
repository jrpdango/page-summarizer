import { statusType } from '../constants.js';

export const handleError = ({ message, res, job }) => {
    if(!message || !res) {
        throw new Error('message or res must be defined');
    }
    
    console.error(`${new Date().toLocaleString()} - ${message}`);
    if(!job) {
        res.status(400).send({
            error: message,
            status: statusType.FAILED,
        });
        return;
    }

    const uuid = job.insertToDb({
        status: statusType.FAILED,
        errorMessage: message
    });
    res.status(400).send({
        uuid,
        error: message,
        status: statusType.FAILED,
    });
    return;
};