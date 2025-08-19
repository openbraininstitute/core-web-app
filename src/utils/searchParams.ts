import { ReadonlyURLSearchParams } from 'next/navigation';

export type SearchParamsObject = Record<string, string | string[] | undefined>;
export type SearchParamsInput = SearchParamsObject | URLSearchParams | ReadonlyURLSearchParams;

function getFromObject(obj: SearchParamsObject, key: string): string | null {
  const v = obj[key];
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function getFromUrlParams(
  sp: URLSearchParams | ReadonlyURLSearchParams,
  key: string
): string | null {
  return sp.get(key);
}

export function getSearchParam(sp: SearchParamsInput, key: string): string | null {
  if (typeof (sp as any)?.get === 'function') {
    return getFromUrlParams(sp as URLSearchParams | ReadonlyURLSearchParams, key);
  }

  return getFromObject(sp as SearchParamsObject, key);
}

export async function getSearchParamAsync(
  spPromise: Promise<SearchParamsObject>,
  key: string
): Promise<string | null> {
  const sp = await spPromise;
  return getFromObject(sp, key);
}

export function toSearchParamsObject(sp: SearchParamsInput): SearchParamsObject {
  if (typeof (sp as any)?.entries === 'function') {
    const out: SearchParamsObject = {};
    for (const [k, v] of (sp as URLSearchParams).entries()) {
      if (out[k] === undefined) out[k] = v;
      else out[k] = Array.isArray(out[k]) ? [...(out[k] as string[]), v] : [out[k] as string, v];
    }
    return out;
  }
  return sp as SearchParamsObject;
}
