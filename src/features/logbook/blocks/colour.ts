// A user always has the same colour on every screen: FNV-1a (32 bit) of the user id picks one of
// the design's actor colours. All of them carry white initials and white text (WCAG AA on 14px).
const PALETTE = [
  '#1677c9',
  '#0f766e',
  '#9d174d',
  '#4d5b0b',
  '#5b4636',
  '#7c3aed',
  '#c2410c',
  '#0e7490',
  '#4338ca',
  '#a16207',
  '#be185d',
  '#15803d',
] as const;

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const encoder = new TextEncoder();

export function fnv1a(text: string): number {
  let hash = FNV_OFFSET;
  for (const byte of encoder.encode(text)) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash;
}

export const colourOf = (userId: string): string =>
  PALETTE[fnv1a(userId) % PALETTE.length] ?? '#595959';
