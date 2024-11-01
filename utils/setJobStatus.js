export const setJobStatus = ({ db, id, status, result }) => {
    return db.run(`UPDATE jobs SET (result, req_status) = ($result, $status) WHERE id = $id`, {
        $result: result,
        $status: status,
        $id: id
    });
};