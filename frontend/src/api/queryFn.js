/**
 * queryFn.js
 *
 * Adapters between the `src/services/*` modules and React Query.
 *
 * The services return raw Axios responses wrapped in the backend's
 * `{ success, data, error }` envelope. React Query wants the payload itself and
 * wants failures to throw. `unwrap` does both, reusing the same envelope logic
 * the rest of the app already goes through.
 *
 *   useQuery({
 *     queryKey: queryKeys.competitions.detail(id),
 *     queryFn: () => unwrap(competitionService.getById(id)),
 *   })
 */

import { unwrapApiPayload, extractErrorMessage } from '../services/serviceUtils';

/**
 * Await a service call and return its payload, throwing on a failed envelope.
 *
 * @template T
 * @param {Promise<unknown>} promise - A call into one of the `src/services` modules.
 * @returns {Promise<T>} The unwrapped payload.
 */
export async function unwrap(promise) {
  return unwrapApiPayload(await promise);
}

/**
 * Turn whatever React Query handed back into a string fit for a toast.
 *
 * Query errors arrive as `Error` from `unwrap`, network failures as Axios
 * errors; `extractErrorMessage` already covers both shapes.
 *
 * @param {unknown} error
 * @returns {string}
 */
export function toMessage(error) {
  return extractErrorMessage(error);
}
