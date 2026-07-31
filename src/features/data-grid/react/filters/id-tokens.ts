/**
 * Token parsing for free-entry filters — an `id` filter target, or any advanced
 * filter that collects a LIST of values. Users paste one or many values from
 * anywhere: a spreadsheet column, a comma-separated list, a JSON array — so tokens
 * are split on any run of whitespace, commas or semicolons, and incidental
 * quotes/brackets are trimmed off each token.
 *
 * Kept free of React so it can be unit-tested on its own.
 */

import { FreeEntryKind } from '../../core';

import type { TFreeEntryKind } from '../../core';

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
  /** the well-formed values sent to the API */
  valid: string[];
  /** malformed tokens — shown in a danger chip and blocking Apply */
  invalid: string[];
}

/**
 * Split pasted text and validate it for the target's {@link TFreeEntryKind}.
 * `uuid` (the default, and the only historical behaviour) rejects anything that is
 * not a canonical UUID; `text` accepts every non-empty token, because a list of
 * exact names or document URLs has nothing to validate against.
 */
export function splitIdTokens(
  input: string,
  kind: TFreeEntryKind = FreeEntryKind.Uuid
): IIdTokenSplit {
  const tokens = parseIdTokens(input);
  if (kind === FreeEntryKind.Text) return { tokens, valid: tokens, invalid: [] };
  return {
    tokens,
    valid: tokens.filter(isUuid),
    invalid: tokens.filter((t) => !isUuid(t)),
  };
}
