/**
 * Format a number as currency
 *
 * @param amount - The amount to format
 * @param currency - The currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number with commas
 *
 * @param num - The number to format
 * @returns Formatted number string with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format bytes to a human-readable string (KB, MB, GB, etc.)
 *
 * @param bytes - The number of bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with appropriate unit
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / k ** i).toFixed(dm)) + ' ' + sizes[i];
}

/** A token carrying a digit ("CA1", "6a", "L2/3") — never a word to lower-case. */
const HAS_DIGIT = /\d/u;
/**
 * Longest all-caps run still read as an acronym. Past it the token is taken for a
 * shouted word, so "CEREBELLUM" lowers while "DNA" survives. A threshold is a
 * judgement call, not a fact — raise it if a longer acronym turns up in real data.
 */
const MAX_ACRONYM_LENGTH = 4;

/** Is this token an acronym, code or name rather than an ordinary word? */
function isPreserved(word: string): boolean {
  if (HAS_DIGIT.test(word)) return true;
  const letters = word.replace(/[^\p{L}]/gu, '');
  const capitals = letters.replace(/[^\p{Lu}]/gu, '').length;
  if (capitals < 2) return false;
  // Two or more capitals AND some lowercase is a name or a suffixed acronym
  // ("VISp", "McDonald") at any length. All capitals is only an acronym while short.
  return capitals < letters.length || letters.length <= MAX_ACRONYM_LENGTH;
}

/**
 * Rewrite a sentence in sentence case: first letter capitalised, the rest lowered.
 *
 * Acronyms, codes and names are left alone — "Primary Somatosensory Area, BARREL
 * field" becomes "Primary somatosensory area, barrel field", while "Field CA1" keeps
 * its CA1. Text that is already correct passes through unchanged.
 *
 * @param text - the sentence to rewrite; nullish and blank input yield `''`
 */
export function toSentenceCase(text?: string | null): string {
  if (!text) return '';
  const lowered = text.replace(/\S+/gu, (word) => (isPreserved(word) ? word : word.toLowerCase()));
  // Capitalise the opening word only when it actually starts with a letter (after any
  // leading punctuation). A sentence opening on a numeral — "3rd ventricle" — takes no
  // capital, and the `d` of `3rd` must certainly not take one.
  return lowered.replace(
    /^([^\p{L}\p{N}]*)(\p{L})/u,
    (_, lead, first) => lead + first.toUpperCase()
  );
}

export function formatCompactNumber(value: number, locale: string = 'en-US'): string {
  const formatter = new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
}
