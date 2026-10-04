import apiClient from '../../api/apiClient';
import { fileService } from '../fileService';
jest.mock('../../api/apiClient');
beforeEach(() => {
  jest.clearAllMocks();
  apiClient.defaults = { baseURL: 'http://localhost:8080' };
  URL.createObjectURL = jest.fn(() => 'blob:test');
  URL.revokeObjectURL = jest.fn();
});
it('downloads a gateway file as a blob without a token in its URL', async () => {
  apiClient.get.mockResolvedValue({ data: new Blob(['entry']) });
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  await fileService.download('/submissions/sub-1/download', 'entry.pdf');
  expect(apiClient.get).toHaveBeenCalledWith('/submissions/sub-1/download', {
    responseType: 'blob',
  });
  expect(click).toHaveBeenCalledTimes(1);
  expect(document.querySelector('a[download]')).toBeNull();
  click.mockRestore();
});
it.each([
  'https://storage.example/submissions/sub-1/download',
  '/users/profile',
  '/submissions/sub-1/download?token=secret',
])('never dispatches authenticated requests to unsafe links: %s', async (value) => {
  await expect(fileService.download(value, 'entry.pdf')).rejects.toThrow(/unavailable/);
  expect(apiClient.get).not.toHaveBeenCalled();
});
