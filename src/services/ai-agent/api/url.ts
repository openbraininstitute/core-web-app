const AGENT_URL = process.env.NEXT_PUBLIC_AI_AGENT_URL ?? '(Missing NEXT_PUBLIC_AI_AGENT_URL)';

/**
 * This function can be used to set the `api` property
 * of `useChat`.
 */
export function serviceAiAgentUrl(...items: string[]) {
  return [AGENT_URL, ...items]
    .map((item) => {
      if (item.endsWith('/')) return item.slice(0, -1);
      return item;
    })
    .join('/');
}
