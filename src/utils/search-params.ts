import { pick } from 'es-toolkit/compat';

/**
 * cleans a set of search parameters by keeping only specified keys.
 *
 * @param searchParams - A URLSearchParams instance, query string, or plain object.
 * @param keepKeys - An array of keys to keep (e.g., ['br_id', 'br_av']).
 * @returns A new URLSearchParams instance containing only the kept keys.
 */
export const cleanSearchParams = ({
  searchParams,
  keepKeys,
}: {
  searchParams: URLSearchParams | string | Record<string, string>;
  keepKeys: string[];
}): URLSearchParams => {
  let paramsObj: Record<string, string>;

  if (typeof searchParams === 'string') {
    paramsObj = Object.fromEntries(new URLSearchParams(searchParams));
  } else if (searchParams instanceof URLSearchParams) {
    paramsObj = Object.fromEntries(searchParams.entries());
  } else {
    paramsObj = searchParams;
  }

  const cleaned = pick(paramsObj, keepKeys);
  return new URLSearchParams(cleaned);
};
