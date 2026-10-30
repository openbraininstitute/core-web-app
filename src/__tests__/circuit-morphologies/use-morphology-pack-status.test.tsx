import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { useMorphologyPackStatus } from '@/features/circuit-viewer/morphologies/use-morphology-pack-status';
import { circuitMorphologiesFlag } from '@/features/feature-flags/flags';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { MorphologyPackStatus } from '@/api/small-scale-simulator/circuit/morphology-pack';

const h = vi.hoisted(() => ({
  flag: true,
  params: { virtualLabId: 'lab', projectId: 'project' } as Record<string, string | undefined>,
  answers: [] as (MorphologyPackStatus | Error)[],
  request: vi.fn(),
}));

vi.mock('@/features/feature-flags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/feature-flags')>()),
  useFlag: (key: string) => key === circuitMorphologiesFlag.key && h.flag,
}));

vi.mock('next/navigation', () => ({ useParams: () => h.params }));

vi.mock('@/api/small-scale-simulator/circuit/morphology-pack', () => ({
  requestMorphologyPack: h.request,
}));

const MICRO = { id: 'micro', scale: CircuitScaleDictionary.Microcircuit } as ICircuit;
const BUILDING: MorphologyPackStatus = { state: 'building', queue_position: 0 };
const READY: MorphologyPackStatus = { state: 'ready', size: 1234, sha256: 'ab12' };

let client: QueryClient;

function render(circuit: ICircuit | undefined, poll = false) {
  return renderHook(({ of }) => useMorphologyPackStatus(of, { poll }), {
    initialProps: { of: circuit },
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

beforeEach(() => {
  client = new QueryClient();
  h.flag = true;
  h.params = { virtualLabId: 'lab', projectId: 'project' };
  h.answers = [];
  h.request.mockImplementation(async () => {
    const answer = h.answers.shift() ?? READY;
    if (answer instanceof Error) throw answer;
    return answer;
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useMorphologyPackStatus', () => {
  it("asks Bluenaas for the circuit's pack in the route's workspace, undefined until it answers", async () => {
    const { result } = render(MICRO);
    expect(result.current).toBeUndefined();

    await waitFor(() => expect(result.current).toEqual(READY));
    expect(h.request).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        ctx: { virtualLabId: 'lab', projectId: 'project' },
        circuitId: 'micro',
      })
    );
  });

  it.each([
    ['no circuit', undefined, () => {}],
    ['a single cell', { id: 'one', scale: CircuitScaleDictionary.Single } as ICircuit, () => {}],
    ['the flag off', MICRO, () => (h.flag = false)],
    ['no project', MICRO, () => (h.params = { virtualLabId: 'lab' })],
  ])('asks nothing, and answers null, for %s', async (_, circuit, given) => {
    given();
    const { result } = render(circuit);
    await act(() => new Promise((resolve) => setTimeout(resolve, 5)));

    expect(result.current).toBeNull();
    expect(h.request).not.toHaveBeenCalled();
  });

  it('answers failed where Bluenaas cannot be asked', async () => {
    h.answers = [new Error('502'), new Error('502')];
    const { result } = render(MICRO);

    await waitFor(() => expect(result.current).toEqual({ state: 'failed' }), { timeout: 5_000 });
  });

  it('asks again every 10 s while the pack builds, where told to, and stops once it is ready', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    h.answers = [BUILDING, BUILDING, READY];
    const { result } = render(MICRO, true);
    await waitFor(() => expect(result.current).toEqual(BUILDING));

    await act(() => vi.advanceTimersByTimeAsync(10_000));
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    await waitFor(() => expect(result.current).toEqual(READY));
    await act(() => vi.advanceTimersByTimeAsync(30_000));

    expect(h.request).toHaveBeenCalledTimes(3);
  });

  it('asks once while the pack builds where not told to ask again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    h.answers = [BUILDING];
    const { result } = render(MICRO);
    await waitFor(() => expect(result.current).toEqual(BUILDING));
    await act(() => vi.advanceTimersByTimeAsync(30_000));

    expect(h.request).toHaveBeenCalledTimes(1);
  });

  it('forgets the answer once nothing reads it, so the next visit asks again', async () => {
    h.answers = [BUILDING, READY];
    const first = render(MICRO);
    await waitFor(() => expect(first.result.current).toEqual(BUILDING));
    first.unmount();
    await act(() => new Promise((resolve) => setTimeout(resolve, 5)));

    const next = render(MICRO);
    expect(next.result.current).toBeUndefined();
    await waitFor(() => expect(next.result.current).toEqual(READY));
  });
});
