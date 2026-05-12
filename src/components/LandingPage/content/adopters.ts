import { useMemo } from 'react';

import { useSanity } from '@/services/sanity';

import query from './adopters.groq';

export interface ContentForAdopterItem {
  name: string;
  url: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

function isSanityArray(data: unknown): data is unknown[] {
  return Array.isArray(data);
}

function toStr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function toNum(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function normalizeAdopters(raw: unknown[] | null | undefined): ContentForAdopterItem[] {
  if (!raw?.length) {
    return [];
  }
  const out: ContentForAdopterItem[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const o = item as Record<string, unknown>;
    const name = toStr(o.name) || 'Adopter';
    const url =
      toStr(o.url) || toStr(o.website) || toStr(o.href) || toStr(o.link) || toStr(o.externalUrl);
    const imageURL = toStr(o.imageURL);
    const rawWidth = toNum(o.imageWidth);
    const rawHeight = toNum(o.imageHeight);
    if (!imageURL) {
      continue;
    }
    // Sanity often omits metadata.dimensions until processing finishes; defaults keep next/image usable.
    const imageWidth = rawWidth > 0 ? rawWidth : 240;
    const imageHeight = rawHeight > 0 ? rawHeight : 48;
    out.push({ name, url, imageURL, imageWidth, imageHeight });
  }
  return out;
}

export function useSanityContentForAdopters(): ContentForAdopterItem[] {
  const raw = useSanity(query, isSanityArray);
  return useMemo(() => normalizeAdopters(raw ?? []), [raw]);
}
