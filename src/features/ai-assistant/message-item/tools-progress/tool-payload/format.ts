/**
 * Pure helper utilities for the ToolPayload generic renderer.
 * No tool-specific logic — purely structural inference.
 */

const ACRONYMS = new Set(['id', 'url', 'uri', 'api', 'uuid', 'ip', 'html', 'css', 'json', 'xml']);

/**
 * Convert snake_case, camelCase, kebab-case, or dotted.path keys
 * to sentence-case labels.
 */
export function humanizeKey(key: string): string {
  // Split on separators and camelCase boundaries
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase
    .replace(/[._-]+/g, ' ') // snake, kebab, dot
    .trim()
    .toLowerCase()
    .split(/\s+/);

  if (words.length === 0) return key;

  return words
    .map((word, i) => {
      if (ACRONYMS.has(word)) return word.toUpperCase();
      if (i === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      return word;
    })
    .join(' ');
}

export type DetectedType =
  | 'null'
  | 'boolean'
  | 'number'
  | 'uuid'
  | 'url'
  | 'iso-date'
  | 'long-string'
  | 'string'
  | 'array'
  | 'object';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URL_RE = /^https?:\/\//i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})/;

const LONG_STRING_THRESHOLD = 80;

/**
 * Detect the display type of a value for rendering decisions.
 * Order matters — more specific types checked first.
 */
export function detectType(value: unknown): DetectedType {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number' && Number.isFinite(value)) return 'number';
  if (typeof value === 'number') return 'number'; // NaN/Infinity still rendered as number
  if (typeof value === 'string') {
    if (UUID_RE.test(value)) return 'uuid';
    if (URL_RE.test(value)) return 'url';
    if (ISO_DATE_RE.test(value) && !Number.isNaN(Date.parse(value))) return 'iso-date';
    if (value.length > LONG_STRING_THRESHOLD) return 'long-string';
    return 'string';
  }
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'string';
}

const BYTE_HINT_RE = /\b(bytes|byte_size|file_size|content.?length|payload.?size)\b/i;

/**
 * Format a number as human-readable bytes (KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Whether a key + numeric value likely represents bytes.
 * Only triggers for keys that strongly suggest byte counts and values > 100.
 */
export function isLikelyBytes(key: string, value: number): boolean {
  return BYTE_HINT_RE.test(key) && value > 100 && Number.isFinite(value);
}

/**
 * Truncate a string in the middle, keeping head and tail visible.
 */
export function truncateMiddle(str: string, head = 8, tail = 6): string {
  if (str.length <= head + tail + 3) return str;
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

/**
 * Truncate a URL for display, keeping the domain and tail.
 */
export function truncateUrl(url: string, maxLen = 50): string {
  if (url.length <= maxLen) return url;
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    const available = maxLen - u.origin.length - 1;
    if (available < 10) return truncateMiddle(url, 20, 15);
    return `${u.origin}${truncateMiddle(path, Math.floor(available / 2), Math.floor(available / 3))}`;
  } catch {
    return truncateMiddle(url, 25, 15);
  }
}

export function isLikelyUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function isUrl(value: unknown): value is string {
  return typeof value === 'string' && URL_RE.test(value);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * Safely parse a JSON value. Returns the parsed value if it's a string,
 * or the value itself otherwise.
 */
export function safeParse(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * Pick a "title" field from an object heuristically.
 */
const TITLE_CANDIDATES = ['name', 'title', 'label', 'id'];

export function pickTitle(obj: Record<string, unknown>): { key: string; value: string } | null {
  for (const candidate of TITLE_CANDIDATES) {
    if (candidate in obj && typeof obj[candidate] === 'string') {
      return { key: candidate, value: obj[candidate] as string };
    }
  }
  return null;
}
