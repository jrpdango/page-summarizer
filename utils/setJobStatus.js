export const setJobStatus = (db, id, status, message) => {
    return db.run(`UPDATE jobs SET (result, req_status) = ($result, ${status}) WHERE id = $id`, {
        $result: message,
        $id: id
    });
};