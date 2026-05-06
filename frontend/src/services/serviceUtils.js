/**
 * Normalize an Axios error response into a consistent error message string.
 * Checks the backend's standard { message, error } envelope before falling back.
 *
 * @param {unknown} err - The caught error value.
 * @returns {string} A human-readable error message.
 */
export function extractErrorMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error  ||
    err?.message                ||
    'An unexpected error occurred'
  );
}

/**
 * Normalize the backend's supported success payload shapes.
 *
 * Supported inputs:
 * - Axios response: { data: ... }
 * - Standard ApiResponse: { success: true, data: ... }
 * - Historical raw values: string/object/array
 */
export function unwrapApiPayload(result) {
  const payload = result && Object.prototype.hasOwnProperty.call(result, 'data')
    ? result.data
    : result;

  if (
    payload &&
    typeof payload === 'object' &&
    Object.prototype.hasOwnProperty.call(payload, 'success') &&
    Object.prototype.hasOwnProperty.call(payload, 'data')
  ) {
    if (payload.success === false) {
      throw new Error(payload.error || 'Request failed');
    }
    return payload.data;
  }

  return payload;
}

/**
 * Wrap an async service call, normalizing the response to { data, error }.
 * Callers can destructure without individual try/catch blocks.
 *
 * @template T
 * @param {() => Promise<T>} fn - Async function to execute.
 * @returns {Promise<{ data: T | null, error: string | null }>}
 *
 * Usage:
 *   const { data, error } = await safeCall(() => competitionService.create(dto));
 */
export async function safeCall(fn) {
  try {
    const result = await fn();
    return { data: unwrapApiPayload(result), error: null };
  } catch (err) {
    return { data: null, error: extractErrorMessage(err) };
  }
}
