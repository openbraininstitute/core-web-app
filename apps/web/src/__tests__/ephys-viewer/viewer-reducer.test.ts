import { describe, expect, it } from 'vitest';

import { TraceViewMode } from '@/features/ephys-viewer/components/trace-view-mode-toggle';
import { type TViewerState, viewerReducer } from '@/features/ephys-viewer/ephys-viewer';

const initial: TViewerState = {
  view: TraceViewMode.Overview,
  cellId: 'All',
  protocol: 'All',
  repetition: undefined,
};

describe('viewerReducer', () => {
  it('changes the view without disturbing the selection', () => {
    const next = viewerReducer(initial, { type: 'setView', view: TraceViewMode.Detailed });

    expect(next.view).toBe(TraceViewMode.Detailed);
    expect(next.cellId).toBe('All');
    expect(next.protocol).toBe('All');
  });

  it('changes the protocol without disturbing the view', () => {
    const next = viewerReducer(initial, { type: 'setProtocol', protocol: 'IDrest' });

    expect(next.protocol).toBe('IDrest');
    expect(next.view).toBe(TraceViewMode.Overview);
  });

  it('opens a repetition as one transition', () => {
    // this was three separate setters, so the details view could render against a protocol and a
    // repetition that did not belong together
    const next = viewerReducer(initial, {
      type: 'showRepetition',
      protocol: 'APWaveform',
      repetition: 'repetition 01',
    });

    expect(next).toEqual({
      view: TraceViewMode.Detailed,
      cellId: 'All',
      protocol: 'APWaveform',
      repetition: 'repetition 01',
    });
  });

  it('never mutates the state it is given', () => {
    const before = { ...initial };
    viewerReducer(initial, { type: 'setCellId', cellId: 'cell-1' });

    expect(initial).toEqual(before);
  });
});

/**
 * `showViewModeToggle: false` pins the view rather than seeding it, because a host that hides the
 * switch leaves no way back from the overview. The reducer still accepts `setView` — the overview's
 * repetition tiles dispatch through it — so pinning has to happen at the read, not the write.
 */
describe('pinned view with the mode toggle hidden', () => {
  const resolveView = (state: TViewerState, showViewModeToggle: boolean) =>
    showViewModeToggle ? state.view : TraceViewMode.Detailed;

  it('reads as detailed even when the state says overview', () => {
    expect(resolveView(initial, false)).toBe(TraceViewMode.Detailed);
  });

  it('survives a setView that would otherwise strand the host on the overview', () => {
    const next = viewerReducer(initial, { type: 'setView', view: TraceViewMode.Overview });

    expect(resolveView(next, false)).toBe(TraceViewMode.Detailed);
    expect(resolveView(next, true)).toBe(TraceViewMode.Overview);
  });
});
