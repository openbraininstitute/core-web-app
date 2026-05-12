import { getClient } from '@/services/sanity/client';
import { tryType } from '@/services/sanity/type-utils';
import { logError } from '@/util/logger';

import type { TypeDef } from '@/util/type-guards';

export interface ContentForFeatures {
  titleH1?: string;
  titleH2?: string;
  headline?: string;
  description?: string;
  useCases: string[];
  data?: Array<{ label: string; value: string | number }>;
  backgroundColor?: string;
  backgroundImage?: string;
  theme?: string;
}

interface RawFeature {
  titleH1?: unknown;
  titleH2?: unknown;
  headline?: unknown;
  headLine?: unknown;
  description?: unknown;
  useCases?: unknown;
  data?: unknown;
  backgroundColor?: unknown;
  backgroundImage?: unknown;
  theme?: unknown;
}

const typeRawFeatures: TypeDef = [
  'array',
  [
    'partial',
    {
      titleH1: 'unknown',
      titleH2: 'unknown',
      headline: 'unknown',
      headLine: 'unknown',
      description: 'unknown',
      useCases: 'unknown',
      data: 'unknown',
      backgroundColor: 'unknown',
      backgroundImage: 'unknown',
      theme: 'unknown',
    },
  ],
];

function isRawFeatures(data: unknown): data is RawFeature[] {
  return tryType('RawFeatures', data, typeRawFeatures);
}

function asStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function normalizeUseCases(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null && 'title' in item) {
      return String((item as { title: unknown }).title ?? '');
    }
    return String(item);
  });
}

function normalizeData(raw: unknown): ContentForFeatures['data'] {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((item) => {
    const r = (item ?? {}) as Record<string, unknown>;
    const label = String(r.label ?? r.name ?? '');
    const rawValue = r.value;
    const value: string | number = typeof rawValue === 'number' ? rawValue : String(rawValue ?? '');
    return { label, value };
  });
}

function normalize(raw: RawFeature): ContentForFeatures {
  return {
    titleH1: asStringOrUndefined(raw.titleH1),
    titleH2: asStringOrUndefined(raw.titleH2),
    headline: asStringOrUndefined(raw.headline) ?? asStringOrUndefined(raw.headLine),
    description: asStringOrUndefined(raw.description),
    useCases: normalizeUseCases(raw.useCases),
    data: normalizeData(raw.data),
    backgroundColor: asStringOrUndefined(raw.backgroundColor),
    backgroundImage: asStringOrUndefined(raw.backgroundImage),
    theme: asStringOrUndefined(raw.theme),
  };
}

const QUERY = `*[_type=="pages"][slug.current=="features"][0]{
  "features": content[_type=="singleFeature"]{
    titleH1,
    titleH2,
    headline,
    headLine,
    description,
    useCases,
    data,
    backgroundColor,
    theme,
    "backgroundImage": backgroundImage.asset->url,
  }
}.features`;

export async function getFeaturesContent(): Promise<ContentForFeatures[]> {
  try {
    const data = await getClient().fetch(QUERY);
    if (isRawFeatures(data)) return data.map(normalize);
  } catch (ex) {
    logError('Error fetching features content:', ex);
  }
  return [];
}
