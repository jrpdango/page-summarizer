import { getJobHandler } from "../handlers/getJobHandler";

const mockRes = {
    send: jest.fn()
};
const mockDB = {
    get: jest.fn()
};

describe('get job', () => {
    it('should return job details without error message when job has no error', () => {
        const req = { query: { uuid: 'some-uuid' } };
        const job = {
          id: 1,
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
});