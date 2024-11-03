import { getJobHandler } from "../handlers/getJobHandler";
import { createJobHandler } from "../handlers/createJobHandler";
import { statusType } from "../constants";
import { handleError } from "../utils/handleError";
import { scrapePage } from "../utils/scrapePage";
import { summarize } from "../services/ai";
import { Job } from "../models/job";

const mockRes = {
  send: jest.fn()
};
const mockDB = {
  get: jest.fn(),
  run: jest.fn()
};

jest.mock('../utils/handleError', () => ({ handleError: jest.fn() }));
jest.mock('../utils/scrapePage.js', () => ({ scrapePage: jest.fn() }));
jest.mock('../services/ai.js', () => ({ summarize: jest.fn() }));
jest.mock('../models/job.js', () => ({ 
  Job: jest.fn((db, url) => ({ 
    uuid: 'some-uuid',
    db: mockDB,
    insertToDb: jest.fn((status, errorMessage) => { 
      mockDB.run('some-insert-query', { some: 'params' });
      return 'some-uuid';
    }), 
    updateFields: jest.fn((status, result, errorMessage) => {
      mockDB.run('some-update-query', { some: 'params' });
      return {};
    }) 
  })) 
}));

describe('get job', () => {
    it('should return job details without error message when job has no error', () => {
        const req = { query: { uuid: 'some-uuid' } };
        const job = {
          url: 'https://example.com',
          result: 'some summary here',
          req_status: 'completed',
          error_message: null,
        };

        mockDB.get.mockImplementationOnce((query, params, callback) => {
            callback(null, job);
        });
        
        getJobHandler(req, mockRes, mockDB);
    
        expect(mockRes.send).toHaveBeenCalledWith({
          uuid: 'some-uuid',
          url: 'https://example.com',
          result: 'some summary here',
          status: 'completed',
        });
    });

    it('should return job details with error message when job has error', () => {
        const req = { query: { uuid: 'some-uuid' } };
        const job = {
          url: 'https://example.com',
          result: null,
          req_status: 'failed',
          error_message: 'Some error',
        };
    
        mockDB.get.mockImplementationOnce((query, params, callback) => callback(null, job));
    
        getJobHandler(req, mockRes, mockDB);
    
        expect(mockRes.send).toHaveBeenCalledWith({
          uuid: 'some-uuid',
          url: 'https://example.com',
          result: null,
          status: 'failed',
          error: 'Some error',
        });
    });

    it('should return error when no uuid is provided', () => {
        const req = { query: {} };
    
        getJobHandler(req, mockRes, mockDB);
    
        expect(handleError).toHaveBeenCalledWith({
          message: 'No uuid query param provided',
          res: mockRes,
        });
        expect(mockRes.send).not.toHaveBeenCalled();
    });

    it('should return error when DB retrieval fails', () => {
        const req = { query: { uuid: 'some-uuid' } };
        const error = new Error('Some error');
    
        mockDB.get.mockImplementationOnce((query, params, callback) => {
            callback(error, null);
        });
    
        getJobHandler(req, mockRes, mockDB);
    
        expect(handleError).toHaveBeenCalledWith({
          message: 'Failed to retrieve job from DB. Try checking if the provided UUID is correct',
          res: mockRes,
        });
        expect(mockRes.send).not.toHaveBeenCalled();
    });
});

describe('create job', () => {
  const logSpy = jest.spyOn(global.console, 'log');

    it('should summarize a Lifewire article', async () => {
        const req = { body: { url: 'https://www.lifewire.com/some-article' } };
        const browser = {};
        const mockScraped = 'some scraped text';
        const mockSummary = 'some summary text';

        scrapePage.mockReturnValueOnce(mockScraped);
        summarize.mockReturnValueOnce({ response: { text: () => mockSummary } });

        await createJobHandler(req, mockRes, mockDB, browser);

        expect(Job).toHaveBeenCalledWith({ db: mockDB, url: req.body.url });
        expect(mockDB.run).toHaveBeenCalledWith('some-insert-query', { some: 'params' });
        expect(mockRes.send).toHaveBeenCalledWith({
            status: statusType.PENDING,
            url: req.body.url,
            uuid: expect.any(String)
        });
        expect(scrapePage).toHaveBeenCalledWith({ browser, url: req.body.url });
        expect(summarize).toHaveBeenCalledWith(mockScraped);
        expect(mockDB.run).toHaveBeenCalledWith('some-update-query', { some: 'params' });
        expect(logSpy).toHaveBeenCalled();
    });
});