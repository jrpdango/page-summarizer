import { summarize } from '../services/ai.js';
import { Job } from '../models/job.js';
import { statusType } from '../constants.js';
import { handleError } from '../utils/handleError.js';
import { scrapePage } from '../utils/scrapePage.js';

export class JobController {
    constructor(db, browser) {
        this.db = db;
        this.browser = browser;
    }

    getJob(req, res) {
        const uuid = req.query.uuid;
    
        // Check if UUID hasn't been provided
        if(!uuid) {
            handleError({ message: 'No uuid query param provided', res });
            return;
        }
    
        this.db.get('SELECT id, url, result, req_status, error_message FROM jobs WHERE uuid = $uuid', {
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
                    url: row.url,
                    result: row.result,
                    status: row.req_status,
                    error: row.error_message
                });
                return;
            }
            res.send({
                uuid,
                url: row.url,
                result: row.result,
                status: row.req_status,
            });
        });
    }

    async createJob(req, res) {
        const url = req.body.url;
        const job = new Job({ db: this.db, url });
    
        // Check if url hasn't been provided
        if(!url) {
            handleError({
                message: 'POST body must have a "url" property',
                res,
                job
            });
            return;
        }
    
        // Check if url from Lifewire or is invalid
        try {
            const urlObj = new URL(url);
            if(urlObj.hostname !== 'www.lifewire.com') {
                handleError({
                    message: 'For the purposes of this demo, only Lifewire articles are supported.',
                    res,
                    job
                });
                return;
            }
        } catch (error) {
            handleError({
                message: error.message, // "Invalid URL"
                res,
                job
            });
            return;
        }
    
        job.insertToDb({ status: statusType.PENDING });
        res.send({
            uuid: job.uuid,
            url,
            status: statusType.PENDING
        });
        
        const text = await this.getText(job);
        if(!text) return;
        const aiResponse = await this.getAiResponse(text, job);
        if(!aiResponse) return;
    
        job.updateFields({
            status: statusType.COMPLETED,
            result: aiResponse.response.text()
        });
        console.log(`${new Date().toLocaleString()} - Job ${job.uuid} done`);
    }

    async getText(job) {
        let text;
        try {
            text = await scrapePage({ browser: this.browser, url: job.url });
        } catch (error) {
            console.error(`Puppeteer error: ${error.message}`);
            job.updateFields({ 
                status: statusType.FAILED,
                errorMessage: 'Failed to retrieve text content'
            });
            return null;
        }
        return text;
    }

    async getAiResponse(text, job) {
        let aiResponse;
        try {
            aiResponse = await summarize(text);
    
        } catch(error) {
            console.error(`AI service error: ${error.message}`);
            job.updateFields({
                status: statusType.FAILED,
                errorMessage: 'Failed to fetch AI response'
            });
            return null;
        }
        return aiResponse;
    }
}