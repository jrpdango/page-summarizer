export const handleError = ({ message, res, job }) => {
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