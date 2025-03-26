import { isString } from '@/util/type-guards';

const AGENT_URL = process.env.NEXT_PUBLIC_AI_AGENT_URL ?? '(Missing NEXT_PUBLIC_AI_AGENT_URL)';

/**
 * This function can be used to set the `api` property
 * of `useChat`.
 */
export function serviceAiAgentUrl(
  entrypoint: string | string[],
  params?: Record<string, string | null>
) {
  const items = Array.isArray(entrypoint) ? entrypoint : [entrypoint];
  const url = [AGENT_URL, ...items]
    .map((item) => {
      if (item.endsWith('/')) return item.slice(0, -1);
      return item;
    })
    .join('/');
  if (!params) return url;

  const urlParams = Object.keys(params)
    .filter((key) => isString(params[key]))
    .map((key) => `${key}=${encodeURIComponent(params[key] as string)}`);
  if (urlParams.length === 0) return url;

  return `${url}?${urlParams.join('&')}`;
}
