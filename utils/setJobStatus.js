export const setJobStatus = ({ db, uuid, status, result }) => {
    return db.run(`UPDATE jobs SET (result, req_status) = ($result, $status) WHERE uuid = $uuid`, {
        $result: result,
        $status: status,
        $uuid: uuid
    });
};