import { extractErrorMessage, safeCall, unwrapApiPayload } from '../serviceUtils';

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

  it('unwraps a standard ApiResponse envelope', async () => {
    const result = await safeCall(async () => ({
      data: { success: true, data: { id: 'c-1' }, error: null },
    }));
    expect(result).toEqual({ data: { id: 'c-1' }, error: null });
  });

  it('treats a failed ApiResponse envelope as a normalized error', async () => {
    const result = await safeCall(async () => ({
      data: { success: false, data: null, error: 'business rule failed' },
    }));
    expect(result).toEqual({ data: null, error: 'business rule failed' });
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

describe('unwrapApiPayload', () => {
  it('returns the data field for Axios responses', () => {
    expect(unwrapApiPayload({ data: { value: 1 } })).toEqual({ value: 1 });
  });

  it('returns the inner data for ApiResponse envelopes', () => {
    expect(unwrapApiPayload({
      success: true,
      data: ['a'],
      error: null,
    })).toEqual(['a']);
  });

  it('preserves historical raw payloads', () => {
    expect(unwrapApiPayload('deleted')).toBe('deleted');
  });
});
