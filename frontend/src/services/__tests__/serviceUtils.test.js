import { extractErrorMessage, safeCall } from '../serviceUtils';

describe('extractErrorMessage', () => {
  it('prefers response.data.message when present', () => {
    const err = { response: { data: { message: 'specific reason' } }, message: 'generic' };
    expect(extractErrorMessage(err)).toBe('specific reason');
  });

  it('falls back to response.data.error when no message', () => {
    const err = { response: { data: { error: 'backend error' } }, message: 'generic' };
    expect(extractErrorMessage(err)).toBe('backend error');
  });

  it('falls back to err.message when there is no response payload', () => {
    expect(extractErrorMessage({ message: 'network down' })).toBe('network down');
  });

  it('returns the default sentinel when no signal is available', () => {
    expect(extractErrorMessage(null)).toBe('An unexpected error occurred');
    expect(extractErrorMessage(undefined)).toBe('An unexpected error occurred');
    expect(extractErrorMessage({})).toBe('An unexpected error occurred');
  });
});

describe('safeCall', () => {
  it('returns { data, error: null } on success', async () => {
    const result = await safeCall(async () => ({ data: { id: 1 } }));
    expect(result).toEqual({ data: { id: 1 }, error: null });
  });

  it('unwraps a response.data shape automatically', async () => {
    const result = await safeCall(async () => ({ data: 'payload' }));
    expect(result.data).toBe('payload');
  });

  it('returns the raw value when the call did not produce a .data field', async () => {
    const result = await safeCall(async () => 'plain');
    expect(result).toEqual({ data: 'plain', error: null });
  });

  it('returns { data: null, error: <message> } on rejection', async () => {
    const result = await safeCall(async () => {
      throw { response: { data: { message: 'nope' } } };
    });
    expect(result).toEqual({ data: null, error: 'nope' });
  });

  it('uses the default sentinel when the rejection has no message', async () => {
    const result = await safeCall(async () => {
      throw {};
    });
    expect(result.error).toBe('An unexpected error occurred');
  });
});
