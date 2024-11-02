import { summarize } from '../services/ai.js';
import { Job } from '../models/job.js';
import { statusType } from '../constants.js';
import { handleError } from '../utils/handleError.js';
import { scrapePage } from '../utils/scrapePage.js';

export const createJobHandler = async (req, res, db, browser) => {
    const url = req.body.url;
    const job = new Job({ db, url });

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
    
    let text;
    try {
        text = await scrapePage({ browser, url });
    } catch (error) {
        console.error(`Puppeteer error: ${error.message}`);
        job.updateFields({ 
            status: statusType.FAILED,
            errorMessage: 'Failed to retrieve text content'
        });
        return;
    }

    let aiResponse;
    try {
        aiResponse = await summarize(text);

    } catch(error) {
        console.error(`AI service error: ${error.message}`);
        job.updateFields({
            status: statusType.FAILED,
            errorMessage: 'Failed to fetch AI response'
        });
        return;
    }

    job.updateFields({
        status: statusType.COMPLETED,
        result: aiResponse.response.text()
    });

    console.log(`${new Date().toLocaleString()} - Job ${job.uuid} done`);
};