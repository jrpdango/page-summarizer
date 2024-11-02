export class Job {
    uuid = crypto.randomUUID();
    constructor({ db, url }) {
        this.db = db;
        this.url = url;
    }

    insertToDb({ status, errorMessage }) {
        this.db.run('INSERT INTO jobs (uuid, link, req_status, error_message) VALUES ($uuid, $url, $status, $errorMessage)', { 
            $uuid: this.uuid, 
            $url: this.url, 
            $status: status, 
            $errorMessage: errorMessage 
        });
        return this.uuid;
    }

    update({ status, result, errorMessage }) {
        return this.db.run(`UPDATE jobs SET (result, req_status, error_message) = ($result, $status, $errorMessage) WHERE uuid = $uuid`, {
            $result: result,
            $status: status,
            $errorMessage: errorMessage,
            $uuid: this.uuid
        });
    }
}