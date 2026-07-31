/**
 * Token parsing for free-entry id filters (the `id` filter target). Users paste one
 * or many ids from anywhere — a spreadsheet column, a comma-separated list, a JSON
 * array — so tokens are split on any run of whitespace, commas or semicolons, and
 * incidental quotes/brackets are trimmed off each token.
 *
 * Kept free of React so it can be unit-tested on its own.
 */

const SEPARATORS = /[\s,;]+/;
const TRIMMABLE = /^["'[\]()]+|["'[\]()]+$/g;

/** Canonical UUID (any version), case-insensitive. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(token: string): boolean {
  return UUID_PATTERN.test(token);
}

/** Split pasted text into de-duplicated, order-preserving tokens. */
export function parseIdTokens(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(SEPARATORS)) {
    const token = raw.replace(TRIMMABLE, '').trim();
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

export interface IIdTokenSplit {
  /** every token, in input order (what the chips render) */
  tokens: string[];
  /** the well-formed ids sent to the API */
  valid: string[];
  /** malformed tokens — shown in a danger chip and blocking Apply */
  invalid: string[];
}

export function splitIdTokens(input: string): IIdTokenSplit {
  const tokens = parseIdTokens(input);
  return {
    tokens,
    valid: tokens.filter(isUuid),
    invalid: tokens.filter((t) => !isUuid(t)),
  };
}
