import manifest from './optimized-media.json';

type Variant = 'preview' | 'full' | 'chapter' | 'poster' | 'mobile';
type MediaEntry = { src: string; bytes: number; originalBytes: number };
const media: Record<string, Partial<Record<Variant, MediaEntry>>> = manifest;

/** Content-addressed URLs can be cached for a year without serving stale replacements. */
export function optimizedMedia(source: string, variant: Variant = 'chapter'): string {
  const key = source.split('?')[0];
  const entry = media[key]?.[variant];
  // Keep existing cache versions when a master was already smaller than its re-encode.
  return !entry || entry.src === key ? source : entry.src;
}
