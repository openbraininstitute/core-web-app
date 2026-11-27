import type { CircuitSpikes } from '@/features/circuit-viewer/types';

async function responseFor(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Could not load ${url}: ${response.status}`);
  return response;
}

export async function loadActivity(url: string, signal?: AbortSignal): Promise<CircuitSpikes> {
  const response = await responseFor(url, signal);
  const data = (await response.json()) as { cells?: unknown; times?: unknown; ms?: unknown };
  if (
    !Array.isArray(data.cells) ||
    !Array.isArray(data.times) ||
    typeof data.ms !== 'number' ||
    !Number.isFinite(data.ms)
  )
    throw new Error(`Invalid activity data: ${url}`);
  return {
    cellIndices: Uint32Array.from(data.cells),
    times: Float32Array.from(data.times),
    timeMinInMs: 0,
    timeMaxInMs: data.ms,
  };
}

export async function loadBodies(url: string, signal?: AbortSignal): Promise<Uint32Array> {
  const response = await responseFor(url, signal);
  return new Uint32Array(await response.arrayBuffer());
}

export async function loadSkeleton(body: number, signal?: AbortSignal): Promise<string> {
  const response = await responseFor(`/api/walkthrough/male-cns-skeleton/${body}`, signal);
  return response.text();
}
