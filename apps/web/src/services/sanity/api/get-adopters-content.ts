import { getClient } from '@/services/sanity/client';
import { logError } from '@/utils/logger';

import query from './adopters.groq';

export interface ContentForAdopterItem {
  name: string;
  url: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

function toStr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function toNum(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function normalizeAdopters(raw: unknown): ContentForAdopterItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ContentForAdopterItem[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const o = item as Record<string, unknown>;
    const imageURL = toStr(o.imageURL);
    if (!imageURL) continue;
    const name = toStr(o.name) || 'Adopter';
    const url =
      toStr(o.url) || toStr(o.website) || toStr(o.href) || toStr(o.link) || toStr(o.externalUrl);
    const rawWidth = toNum(o.imageWidth);
    const rawHeight = toNum(o.imageHeight);
    // Sanity may omit metadata.dimensions until processing finishes; defaults keep next/image usable.
    const imageWidth = rawWidth > 0 ? rawWidth : 240;
    const imageHeight = rawHeight > 0 ? rawHeight : 48;
    out.push({ name, url, imageURL, imageWidth, imageHeight });
  }
  return out;
}

export async function getAdoptersContent(): Promise<ContentForAdopterItem[]> {
  try {
    const data = await getClient().fetch(query);
    return normalizeAdopters(data);
  } catch (ex) {
    logError('Error fetching adopters content:', ex);
    return [];
  }
}
