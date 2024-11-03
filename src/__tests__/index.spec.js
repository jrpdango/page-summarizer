import { statusType } from "../constants";
import { handleError } from "../utils/handleError";
import { scrapePage } from "../utils/scrapePage";
import { summarize } from "../services/ai";
import { Job } from "../models/job";
import { JobHandler } from "../handlers/job.handler";

const mockRes = {
  send: jest.fn()
};
const mockDB = {
  get: jest.fn(),
  run: jest.fn()
};
const mockBrowser = {};
const mockJobHandler = new JobHandler(mockDB, mockBrowser);

jest.mock('../utils/handleError', () => ({ 
  handleError: jest.fn(({ message, res, job }) => mockRes.send()) 
}));
jest.mock('../utils/scrapePage.js', () => ({ scrapePage: jest.fn() }));
jest.mock('../services/ai.js', () => ({ summarize: jest.fn() }));
jest.mock('../models/job.js', () => ({ 
  Job: jest.fn(({db, url}) => ({ 
    uuid: 'some-uuid',
    db,
    url,
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
    it('should respond with job details without error message when job has no error', () => {
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
        
        mockJobHandler.getJob(req, mockRes, mockDB);
    
        expect(mockRes.send).toHaveBeenCalledWith({
          uuid: 'some-uuid',
          url: 'https://example.com',
          result: 'some summary here',
          status: 'completed',
        });
    });

    it('should respond with job details with error message when job has error', () => {
        const req = { query: { uuid: 'some-uuid' } };
        const job = {
          url: 'https://example.com',
          result: null,
          req_status: 'failed',
          error_message: 'Some error',
        };
    
        mockDB.get.mockImplementationOnce((query, params, callback) => callback(null, job));
    
        mockJobHandler.getJob(req, mockRes, mockDB);
    
        expect(mockRes.send).toHaveBeenCalledWith({
          uuid: 'some-uuid',
          url: 'https://example.com',
          result: null,
          status: 'failed',
          error: 'Some error',
        });
    });

    it('should respond with error when no uuid is provided', () => {
        const req = { query: {} };
        const mockSend = {
          uuid: expect.any(String),
          error: 'No uuid query param provided',
          status: statusType.FAILED
        };

        handleError.mockImplementationOnce(() => mockRes.send(mockSend));
    
        mockJobHandler.getJob(req, mockRes, mockDB);
    
        expect(handleError).toHaveBeenCalledWith({
          message: 'No uuid query param provided',
          res: mockRes,
        });
        expect(mockRes.send).toHaveBeenCalledWith(mockSend);
    });

    it('should respond with error when DB retrieval fails', () => {
        const req = { query: { uuid: 'some-uuid' } };
        const error = new Error('Some error');
        const mockSend = {
          uuid: expect.any(String),
          error: 'Failed to retrieve job from DB. Try checking if the provided UUID is correct',
          status: statusType.FAILED
        };
    
        mockDB.get.mockImplementationOnce((query, params, callback) => {
            callback(error, null);
        });
        handleError.mockImplementationOnce(() => mockRes.send(mockSend));
    
        mockJobHandler.getJob(req, mockRes, mockDB);
    
        expect(handleError).toHaveBeenCalledWith({
          message: 'Failed to retrieve job from DB. Try checking if the provided UUID is correct',
          res: mockRes,
        });
        expect(mockRes.send).toHaveBeenCalledWith(mockSend);
    });
});

describe('create job', () => {
  const logSpy = jest.spyOn(global.console, 'log').mockImplementation((message) => {});
  const errorSpy = jest.spyOn(global.console, 'error').mockImplementation((message) => {});

    it('should summarize a Lifewire article', async () => {
        const req = { body: { url: 'https://www.lifewire.com/some-article' } };
        const mockScraped = 'some scraped text';
        const mockSummary = 'some summary text';

        scrapePage.mockReturnValueOnce(mockScraped);
        summarize.mockReturnValueOnce({ response: { text: () => mockSummary } });

        await mockJobHandler.createJob(req, mockRes);

        expect(Job).toHaveBeenCalledWith({ db: mockDB, url: req.body.url });
        expect(mockDB.run).toHaveBeenCalledWith('some-insert-query', { some: 'params' });
        expect(mockRes.send).toHaveBeenCalledWith({
            status: statusType.PENDING,
            url: req.body.url,
            uuid: expect.any(String)
        });
        expect(scrapePage).toHaveBeenCalledWith({ browser: mockBrowser, url: req.body.url });
        expect(summarize).toHaveBeenCalledWith(mockScraped);
        expect(mockDB.run).toHaveBeenCalledWith('some-update-query', { some: 'params' });
        expect(logSpy).toHaveBeenCalled();
    });

    it('should respond with an error if no url is provided', async () => {
      const req = { body: {} };
      const mockSend = {
        uuid: expect.any(String),
        error: 'POST body must have a "url" property',
        status: statusType.FAILED
      };

      handleError.mockImplementationOnce(() => mockRes.send(mockSend));

      await mockJobHandler.createJob(req, mockRes);

      expect(Job).toHaveBeenCalledWith({ db: mockDB });
      expect(scrapePage).not.toHaveBeenCalled();
      expect(summarize).not.toHaveBeenCalled();
      expect(handleError).toHaveBeenCalledWith({ 
          message: 'POST body must have a "url" property',
          res: mockRes,
          job: expect.any(Object)
      });
      expect(mockRes.send).toHaveBeenCalledWith(mockSend);
    });

    it('should not accept non-Lifewire URLs', async () => {
      const req = { body: { url: 'https://www.random-site.xyz' } };
      const errorMessage = 'For the purposes of this demo, only Lifewire articles are supported.';
      const mockSend = {
        uuid: expect.any(String),
        error: errorMessage,
        status: statusType.FAILED
      };

      handleError.mockImplementationOnce(() => mockRes.send(mockSend));

      await mockJobHandler.createJob(req, mockRes);

      expect(Job).toHaveBeenCalledWith({ db: mockDB, url: req.body.url });
      expect(scrapePage).not.toHaveBeenCalled();
      expect(summarize).not.toHaveBeenCalled();
      expect(handleError).toHaveBeenCalledWith({ 
        message: errorMessage,
        res: mockRes,
        job: expect.any(Object)
      });
      expect(mockRes.send).toHaveBeenCalledWith(mockSend);
    });

    it('should not accept invalid URLs', async () => {
      const req = { body: { url: 'not-a-url' } };
      const errorMessage = 'Invalid URL';
      const mockSend = {
        uuid: expect.any(String),
        error: errorMessage,
        status: statusType.FAILED
      };

      handleError.mockImplementationOnce(() => mockRes.send(mockSend));

      await mockJobHandler.createJob(req, mockRes);

      expect(Job).toHaveBeenCalledWith({ db: mockDB, url: req.body.url });
      expect(scrapePage).not.toHaveBeenCalled();
      expect(summarize).not.toHaveBeenCalled();
      expect(handleError).toHaveBeenCalledWith({ 
        message: errorMessage,
        res: mockRes,
        job: expect.any(Object)
      });
      expect(mockRes.send).toHaveBeenCalledWith(mockSend);
    });

    it('should respond with an error if Pupeteer fails to scrape', async () => {
      const req = { body: { url: 'https://www.lifewire.com/some-article' } };

      scrapePage.mockRejectedValueOnce(new Error('Scraping Error'));

      await mockJobHandler.createJob(req, mockRes);

      expect(Job).toHaveBeenCalledWith({ db: mockDB, url: req.body.url });
      expect(scrapePage).toHaveBeenCalledWith({ browser: mockBrowser, url: req.body.url });
      expect(summarize).not.toHaveBeenCalled();
      expect(mockDB.run).toHaveBeenCalledWith('some-update-query', { some: 'params' });
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should respond with an error if AI fails to respond', async () => {
      const req = { body: { url: 'https://www.lifewire.com/some-article' } };
      const mockScraped = 'some scraped text';

      scrapePage.mockReturnValueOnce(mockScraped);
      summarize.mockRejectedValueOnce(new Error('Scraping Error'));

      await mockJobHandler.createJob(req, mockRes);

      expect(Job).toHaveBeenCalledWith({ db: mockDB, url: req.body.url });
      expect(scrapePage).toHaveBeenCalledWith({ browser: mockBrowser, url: req.body.url });
      expect(summarize).toHaveBeenCalledWith(mockScraped);
      expect(errorSpy).toHaveBeenCalled();
      expect(mockDB.run).toHaveBeenCalledWith('some-update-query', { some: 'params' });
    });
});