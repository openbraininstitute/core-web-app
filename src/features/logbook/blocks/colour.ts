import { FALLBACK_COLOUR, FNV_OFFSET, FNV_PRIME } from '@/features/logbook/constants';

// Same colour for a user on every screen: FNV-1a of the user id picks one.
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
  PALETTE[fnv1a(userId) % PALETTE.length] ?? FALLBACK_COLOUR;
