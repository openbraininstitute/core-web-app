// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GIVE_UP_MS, GpuTimer } from '@/features/entities/em-cell-mesh/viewer/engine/gpu-timer';

const QUERY_RESULT = 1;
const QUERY_RESULT_AVAILABLE = 2;
const SYNC_STATUS = 3;
const SIGNALED = 4;
const SYNC_GPU_COMMANDS_COMPLETE = 5;
const EXT = { TIME_ELAPSED_EXT: 10, GPU_DISJOINT_EXT: 11 };

/** A WebGL 2 context with what the timer uses: results come in after `ready` polls. */
function fakeGl({
  timerQuery,
  ready = 2,
  disjoint = false,
  lost = false,
}: {
  timerQuery: boolean;
  ready?: number;
  disjoint?: boolean;
  lost?: boolean;
}) {
  let polls = 0;
  const calls: string[] = [];
  const gl = {
    QUERY_RESULT,
    QUERY_RESULT_AVAILABLE,
    SYNC_STATUS,
    SIGNALED,
    SYNC_GPU_COMMANDS_COMPLETE,
    getExtension: (name: string) =>
      timerQuery && name === 'EXT_disjoint_timer_query_webgl2' ? EXT : null,
    createQuery: () => ({}),
    beginQuery: () => calls.push('beginQuery'),
    endQuery: () => calls.push('endQuery'),
    deleteQuery: () => calls.push('deleteQuery'),
    getQueryParameter: (_q: unknown, p: number) =>
      p === QUERY_RESULT_AVAILABLE ? ++polls >= ready : 12_500_000,
    getParameter: (p: number) => p === EXT.GPU_DISJOINT_EXT && disjoint,
    fenceSync: () => {
      calls.push('fenceSync');
      return {};
    },
    flush: () => calls.push('flush'),
    getSyncParameter: () => (++polls >= ready ? SIGNALED : 0),
    deleteSync: () => calls.push('deleteSync'),
    isContextLost: () => lost,
  };
  return { gl: gl as unknown as WebGL2RenderingContext, calls };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GpuTimer', () => {
  it("reads a timer query's result once it is in, in ms, one frame at a time", async () => {
    const { gl, calls } = fakeGl({ timerQuery: true });
    const results: number[] = [];
    const timer = new GpuTimer(gl, (ms) => results.push(ms));
    expect(timer.kind).toBe('timer-query');
    timer.begin();
    timer.end();
    expect(timer.busy).toBe(true);
    await vi.advanceTimersByTimeAsync(2);
    expect(results).toEqual([]);
    await vi.advanceTimersByTimeAsync(2);
    expect(results).toEqual([12.5]);
    expect(timer.busy).toBe(false);
    expect(calls).toEqual(['beginQuery', 'endQuery', 'deleteQuery']);
  });

  it('drops a measurement the GPU disjoined', async () => {
    const { gl } = fakeGl({ timerQuery: true, ready: 1, disjoint: true });
    const results: number[] = [];
    const timer = new GpuTimer(gl, (ms) => results.push(ms));
    timer.begin();
    timer.end();
    await vi.advanceTimersByTimeAsync(10);
    expect(results).toEqual([]);
    expect(timer.busy).toBe(false);
  });

  it('times a fence from the start of the frame where there are no timer queries', async () => {
    const { gl, calls } = fakeGl({ timerQuery: false, ready: 3 });
    const results: number[] = [];
    const timer = new GpuTimer(gl, (ms) => results.push(ms));
    expect(timer.kind).toBe('fence');
    timer.begin();
    timer.end();
    await vi.advanceTimersByTimeAsync(20);
    expect(results).toEqual([6]);
    expect(calls).toEqual(['fenceSync', 'flush', 'deleteSync']);
  });

  it('takes a result that never comes for a frame as long as it waited, and polls no more once disposed, deleting the fence either way', async () => {
    const { gl, calls } = fakeGl({ timerQuery: false, ready: Infinity });
    const results: number[] = [];
    const timer = new GpuTimer(gl, (ms) => results.push(ms));
    timer.begin();
    timer.end();
    await vi.advanceTimersByTimeAsync(1100);
    expect(timer.busy).toBe(false);
    expect(results).toEqual([GIVE_UP_MS]);
    expect(calls).toEqual(['fenceSync', 'flush', 'deleteSync']);

    const poll = vi.spyOn(gl, 'getSyncParameter');
    timer.begin();
    timer.end();
    timer.dispose();
    await vi.advanceTimersByTimeAsync(100);
    expect(poll).not.toHaveBeenCalled();
    expect(calls.filter((c) => c === 'deleteSync')).toHaveLength(2);
    expect(results).toEqual([GIVE_UP_MS]);
  });

  it('takes nothing from a result that never came because the context was lost', async () => {
    const { gl } = fakeGl({ timerQuery: true, ready: Infinity, lost: true });
    const results: number[] = [];
    const timer = new GpuTimer(gl, (ms) => results.push(ms));
    timer.begin();
    timer.end();
    await vi.advanceTimersByTimeAsync(1100);
    expect(results).toEqual([]);
  });

  it('deletes a timer query given up on', async () => {
    const { gl, calls } = fakeGl({ timerQuery: true, ready: Infinity });
    const timer = new GpuTimer(gl, () => {});
    timer.begin();
    timer.end();
    await vi.advanceTimersByTimeAsync(1100);
    expect(timer.busy).toBe(false);
    expect(calls).toEqual(['beginQuery', 'endQuery', 'deleteQuery']);
  });
});
