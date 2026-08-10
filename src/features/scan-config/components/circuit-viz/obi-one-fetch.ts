import authFetch from '@/auth-fetch';

/** Query options for OBI-One circuit resources, which never change for a given id. */
export const STATIC_RESOURCE_QUERY_OPTIONS = {
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
} as const;

/** GET an OBI-One JSON resource with the workspace headers; throws on a non-2xx response. */
export async function fetchObiOneJson(
  url: string,
  { virtualLabId, projectId }: { virtualLabId: string; projectId: string }
): Promise<unknown> {
  const res = await authFetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'virtual-lab-id': virtualLabId,
      'project-id': projectId,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch "${url}" (HTTP ${res.status})!`);
  }

  return res.json();
}
