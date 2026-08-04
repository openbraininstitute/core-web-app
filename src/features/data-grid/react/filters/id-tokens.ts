/**
 * Token parsing for free-entry filters. Pasted values come from spreadsheet columns,
 * comma-separated lists and JSON arrays alike, so tokens split on any run of whitespace,
 * commas or semicolons, with incidental quotes/brackets trimmed. Kept free of React.
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
 * Split pasted text and validate for the target's {@link TFreeEntryKind}: `uuid` (the
 * default) rejects non-canonical UUIDs, `text` accepts every non-empty token.
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
