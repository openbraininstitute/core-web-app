import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type ComponentType, lazy, Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CELLS } from '@/features/learn/components/courses/skeleton/cells';
import SkeletonFigure, {
  type SkeletonStep,
} from '@/features/learn/components/courses/skeleton/Figure';
import { CELL } from '@/features/learn/components/courses/skeleton/files';
import {
  CODE_CELLS,
  isCodeStep,
  LABELS,
  LAYOUTS,
  SKELETON_STEPS,
  STATES,
} from '@/features/learn/components/courses/skeleton/views';
import { Embedded } from '@/features/learn/components/embedded';

import type { ViewState } from '@/features/learn/components/courses/skeleton/engine/view';

// Every step renders the figure and waits for its 3D view to load, in jsdom.
vi.setConfig({ testTimeout: 20_000 });

const h = vi.hoisted(() => {
  /** The 3D view's viewer, without three.js: what it is told. */
  class FakeViewer {
    show = vi.fn();
    setFocus = vi.fn();
    setCell = vi.fn();
    setWipe = vi.fn();
    dispose = vi.fn();
    seen = () => Promise.resolve();
    sectionLabels = [];
    heightReach = { chosen: 1, all: 3 };
    onPhase = () => () => {};
    onWipe = () => () => {};
    onScale = () => () => {};
    onLabels = () => () => {};

    constructor() {
      state.viewers.push(this);
    }
  }
  const state = { viewers: [] as FakeViewer[], FakeViewer };
  return state;
});

vi.mock(
  '@/features/learn/components/courses/skeleton/engine/skeleton-viewer',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('@/features/learn/components/courses/skeleton/engine/skeleton-viewer')
    >()),
    SkeletonViewer: h.FakeViewer,
  })
);

// the cell, as much of it as the view's key reads
vi.mock('@/features/learn/components/courses/skeleton/engine/data', async (importOriginal) => {
  const { CELL: facts } = await import('@/features/learn/components/courses/skeleton/files');
  return {
    ...(await importOriginal<
      typeof import('@/features/learn/components/courses/skeleton/engine/data')
    >()),
    loadCell: () =>
      Promise.resolve({
        info: { chosen: facts.chosen, spineLengthRange: facts.spineLengthRange },
        morphology: { sections: [{ type: 3 }] },
        spines: { spineVertexStart: new Uint32Array(facts.counts.spines + 1) },
      }),
  };
});

vi.mock('next/dynamic', () => ({
  default: (load: () => Promise<{ default: ComponentType<object> }>) => {
    const Lazy = lazy(load);
    return (props: object) => (
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    );
  },
}));

/** Something each panel shows, to tell it is the step's own. */
const PANEL_TEXT: Partial<Record<SkeletonStep, string>> = {
  workflow: 'EM mesh skeletonization data processing',
  params: 'Skeletonization Campaign',
  launch: 'launch.py',
  outputs: 'outputs/',
  registered: 'CellMorphologyProtocol',
  swc: 'skeleton.swc',
  h5: CELL.files.h5,
  table: `/edges/${CELL.name}`,
  parts: 'spine_neck_diameter',
  fetch: 'fetch.py',
  downstream: 'EM synapse mapping',
  gotchas: 'Nanometres, voxels and micrometres',
};
const panelText = (step: SkeletonStep) =>
  isCodeStep(step) ? CELLS[CODE_CELLS[step]].label : PANEL_TEXT[step];

/** The figure's two boxes: the 3D view's, and the panel's if the step has one. */
function boxes(container: HTMLElement) {
  const [view, panel, ...rest] = [...(container.firstElementChild?.children ?? [])];
  expect(rest).toEqual([]);
  return { view: view as HTMLElement, panel: panel as HTMLElement | undefined };
}

/** The viewer once it has its cell and has been told its first view. */
async function shown() {
  await waitFor(() => expect(h.viewers[0]?.show).toHaveBeenCalled());
  return h.viewers[0];
}

const lastState = (viewer: InstanceType<typeof h.FakeViewer>) =>
  viewer.show.mock.lastCall?.[0] as ViewState;

beforeEach(() => {
  h.viewers.length = 0;
});

describe('SkeletonFigure', () => {
  it('has something to look for in every panel', () => {
    for (const step of SKELETON_STEPS)
      if (LAYOUTS[step] !== 'full') expect(panelText(step), step).toBeTruthy();
  });

  it.each(SKELETON_STEPS)('lays out %s as views.ts says', async (step) => {
    const { container } = render(<SkeletonFigure step={step} />);
    const view = await screen.findByRole('img', { name: LABELS[step], hidden: true });
    const { view: box, panel } = boxes(container);
    expect(box.contains(view)).toBe(true);
    // the panel alone hides the view, but keeps it
    expect(box.classList.contains('hidden')).toBe(LAYOUTS[step] === 'panel');
    if (LAYOUTS[step] === 'full') expect(panel).toBeUndefined();
    else expect(panel?.textContent).toContain(panelText(step));
    const viewer = await shown();
    const state = step === 'table' ? { ...STATES.table, pick: CELL.chosen.spine } : STATES[step];
    expect(viewer.show).toHaveBeenLastCalledWith(state, { instant: true, spin: state.spin });
  });

  it('keeps one viewer from step to step, and glides to each new view', async () => {
    const { rerender } = render(<SkeletonFigure step="intro" />);
    const viewer = await shown();
    rerender(<SkeletonFigure step="spines" />);
    expect(viewer.show).toHaveBeenLastCalledWith(STATES.spines, { instant: false, spin: false });
    rerender(<SkeletonFigure step="workflow" />);
    expect(viewer.show).toHaveBeenLastCalledWith(STATES.workflow, { instant: false, spin: true });
    // the same view beside the outputs: not told again, so the viewer itself poses it anew
    // once it shows, having been told it while hidden
    const calls = viewer.show.mock.calls.length;
    rerender(<SkeletonFigure step="outputs" back />);
    expect(STATES.outputs).toBe(STATES.workflow);
    expect(viewer.show).toHaveBeenCalledTimes(calls);
    expect(h.viewers).toHaveLength(1);
    expect(viewer.dispose).not.toHaveBeenCalled();
  });

  it('takes the view to a spine picked in the table, and lights the picked row', async () => {
    render(<SkeletonFigure step="table" />);
    const viewer = await shown();
    expect(lastState(viewer)).toMatchObject({ shot: 'pick', pick: CELL.chosen.spine });
    const rows = screen.getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
    expect(rows).toHaveLength(CELL.counts.spines);
    expect(rows[CELL.chosen.spine]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(rows[3]);
    expect(viewer.show).toHaveBeenLastCalledWith(
      { ...STATES.table, pick: 3 },
      { instant: false, spin: false }
    );
    expect(rows[3]).toHaveAttribute('aria-pressed', 'true');
    expect(rows[CELL.chosen.spine]).toHaveAttribute('aria-pressed', 'false');
  });

  it('lights the part of the H5 pointed at, and nothing once the step has changed', async () => {
    const { rerender } = render(<SkeletonFigure step="h5" />);
    const viewer = await shown();
    const edges = screen
      .getByText('The spine table: a dataset per column, a row per spine.')
      .closest('button') as HTMLElement;
    fireEvent.click(edges);
    expect(viewer.setFocus).toHaveBeenLastCalledWith('edges');
    expect(edges).toHaveAttribute('aria-pressed', 'true');
    rerender(<SkeletonFigure step="table" />);
    expect(viewer.setFocus).toHaveBeenLastCalledWith(null);
    rerender(<SkeletonFigure step="h5" back />);
    expect(viewer.setFocus).toHaveBeenLastCalledWith(null);
    expect(
      screen.getByText('The spine table: a dataset per column, a row per spine.').closest('button')
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('is the view alone, always turning, outside its course', async () => {
    const { container, rerender } = render(
      <Embedded value>
        <SkeletonFigure step="workflow" />
      </Embedded>
    );
    const viewer = await shown();
    const { view, panel } = boxes(container);
    expect(panel).toBeUndefined();
    expect(view.classList.contains('hidden')).toBe(false);
    expect(viewer.show).toHaveBeenLastCalledWith(STATES.workflow, { instant: true, spin: true });
    rerender(
      <Embedded value>
        <SkeletonFigure step="spines" />
      </Embedded>
    );
    expect(viewer.show).toHaveBeenLastCalledWith(STATES.spines, { instant: false, spin: true });
    expect(screen.queryByText(CELL.caption)).toBeNull();
  });
});
