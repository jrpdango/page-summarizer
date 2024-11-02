export class Job {
    uuid = crypto.randomUUID();
    constructor({db, url, result, status, errorMessage}) {
        this.db = db;
        this.url = url;
        this.result = result;
        this.status = status;
        this.errorMessage = errorMessage;
    }

    insertToDb() {
        this.db.run('INSERT INTO jobs (uuid, link, req_status, error_message) VALUES ($uuid, $url, $status, $errorMessage)', { 
            $uuid: this.uuid, 
            $url: this.url, 
            $status: this.status, 
            $errorMessage: this.errorMessage 
        });
        return this.uuid;
    }
}