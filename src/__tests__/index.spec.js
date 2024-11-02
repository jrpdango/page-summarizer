import { getJobHandler } from "../handlers/getJobHandler";
import { handleError } from "../utils/handleError";

const mockRes = {
    send: jest.fn()
};
const mockDB = {
    get: jest.fn()
};
jest.mock('../utils/handleError', () => ({
    handleError: jest.fn(),
}));

describe('get job', () => {
    it('should return job details without error message when job has no error', () => {
        const req = { query: { uuid: 'some-uuid' } };
        const job = {
          link: 'https://example.com',
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
          link: 'https://example.com',
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