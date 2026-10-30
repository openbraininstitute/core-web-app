import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadSections } from '@/features/circuit-viewer/morphologies/load/read-sections';
import { SectionType } from '@/features/circuit-viewer/section-type';

const h = vi.hoisted(() => ({ fetchCircuitViz: vi.fn() }));

vi.mock('@/api/one/circuit-visualization', () => ({ fetchCircuitViz: h.fetchCircuitViz }));

const SOMA = {
  id: 'soma',
  sonata_section_id: 0,
  parent_id: null,
  type: SectionType.Soma,
  points: [[0, 0, 0]],
  radii: [6],
};

const MINUTE = 60 * 1000;

// The sections are kept between tests, so each test reads a path of its own.
const client = new QueryClient();
const request = (path: string) => ({ path, virtualLabId: 'lab', projectId: 'project' });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  h.fetchCircuitViz.mockReset();
});

describe("a morphology's sections", () => {
  it('are read once and parsed once, then served as they were', async () => {
    h.fetchCircuitViz.mockResolvedValue([SOMA]);

    const first = await loadSections(client, request('once'));
    const second = await loadSections(client, request('once'));

    expect(first).toEqual([SOMA]);
    expect(second).toBe(first);
    expect(h.fetchCircuitViz).toHaveBeenCalledTimes(1);
    expect(h.fetchCircuitViz).toHaveBeenCalledWith('once', {
      virtualLabId: 'lab',
      projectId: 'project',
    });
  });

  it('are read once for every cell asking while the read is under way', async () => {
    h.fetchCircuitViz.mockResolvedValue([SOMA]);

    const [first, second] = await Promise.all([
      loadSections(client, request('shared')),
      loadSections(client, request('shared')),
    ]);

    expect(second).toBe(first);
    expect(h.fetchCircuitViz).toHaveBeenCalledTimes(1);
  });

  it('are read again in another workspace', async () => {
    h.fetchCircuitViz.mockResolvedValue([SOMA]);

    await loadSections(client, request('workspaces'));
    await loadSections(client, { ...request('workspaces'), projectId: 'another' });

    expect(h.fetchCircuitViz).toHaveBeenCalledTimes(2);
    expect(h.fetchCircuitViz).toHaveBeenLastCalledWith('workspaces', {
      virtualLabId: 'lab',
      projectId: 'another',
    });
  });

  it.each([
    ['could not be read', () => Promise.reject(new Error('502'))],
    ['did not parse', () => Promise.resolve([{ ...SOMA, type: 'soma' }])],
  ])('are read again where they %s', async (what, failure) => {
    h.fetchCircuitViz.mockImplementationOnce(failure).mockResolvedValue([SOMA]);
    const path = `again: ${what}`;

    await expect(loadSections(client, request(path))).rejects.toThrow();
    await expect(loadSections(client, request(path))).resolves.toEqual([SOMA]);
    expect(h.fetchCircuitViz).toHaveBeenCalledTimes(2);
  });

  it('are kept an hour once read', async () => {
    h.fetchCircuitViz.mockResolvedValue([SOMA]);

    await loadSections(client, request('kept'));
    vi.advanceTimersByTime(50 * MINUTE);
    await loadSections(client, request('kept'));
    expect(h.fetchCircuitViz).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(20 * MINUTE);
    await loadSections(client, request('kept'));
    expect(h.fetchCircuitViz).toHaveBeenCalledTimes(2);
  });
});
