import { beforeEach, describe, expect, it, vi } from 'vitest';

// Shared, hoisted state so the `@tolokoban/tgd` mock factory (hoisted above the
// imports) can talk back to the test: handles to settle the in-flight GLB
// `parse`, the contexts every region painter was built against, and a logError spy.
const h = vi.hoisted(() => ({
  resolveParse: null as null | ((asset: unknown) => void),
  rejectParse: null as null | ((reason: unknown) => void),
  xrayContexts: [] as Array<{ id: number; deleted: boolean }>,
  logError: vi.fn(),
}));

// Fake the WebGL toolkit. `TgdDataGlb.parse` is suspended on a controllable
// promise so the test can settle it after a context teardown, and `TgdPainterXRay`
// mimics the real use-after-delete: it throws "[TgdContext] This context has been
// deleted:" when constructed against a deleted context (as the real toolkit does).
vi.mock('@tolokoban/tgd', () => {
  let nextId = 1;
  class TgdContext {
    public readonly id = nextId++;

    public deleted = false;

    public readonly logic = { add: () => undefined };

    add() {}

    paint() {}

    delete() {
      this.deleted = true;
    }
  }
  class TgdPainterGroup {
    add() {}

    remove() {}
  }
  const TgdDataGlb = {
    parse() {
      return new Promise((resolve, reject) => {
        h.resolveParse = resolve;
        h.rejectParse = reject;
      });
    },
  };
  class TgdGeometryGltf {}
  class TgdPainterXRay {
    constructor(context: TgdContext) {
      h.xrayContexts.push({ id: context.id, deleted: context.deleted });
      if (context.deleted) {
        throw new Error(`[TgdContext] This context has been deleted: Context#${context.id}!`);
      }
    }
  }
  class TgdPainterClear {}
  class TgdPainterState {}
  class TgdPainterPointsCloud {
    delete() {}
  }
  class TgdTexture2D {
    loadBitmap() {
      return this;
    }
  }
  return {
    TgdContext,
    TgdPainterGroup,
    TgdDataGlb,
    TgdGeometryGltf,
    TgdPainterXRay,
    TgdPainterClear,
    TgdPainterState,
    TgdPainterPointsCloud,
    TgdTexture2D,
    tgdCanvasCreateFill: () => ({}),
    webglPresetDepth: { lessOrEqual: 'lessOrEqual' },
  };
});

vi.mock('./camera', () => ({
  setCamera: () => ({ resetCamera: () => undefined, fitToBounds: () => undefined }),
}));

vi.mock('./hooks', () => ({
  makeColor: () => ({ color: 'mock' }),
}));

vi.mock('./services/services', () => ({
  getCachedBrainRegionMeshArrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
  getPointCouldData: vi.fn(async () => new Float32Array()),
}));

vi.mock('@/config', () => ({
  config: { MOUSE_ATLAS__ID: 'atlas-1' },
}));

vi.mock('@/utils/logger', () => ({
  logError: (...args: unknown[]) => h.logError(...args),
  log: () => undefined,
}));

// Imported after the mocks are registered (vitest hoists vi.mock above this).
import { Painter } from './painter';
// `errors` is intentionally NOT mocked, so the real class is shared with painter.ts
// and `instanceof` works; `getCachedBrainRegionMeshArrayBuffer` comes from the mock above.
import { RegionMeshNotAvailableError } from './services/errors';
import { getCachedBrainRegionMeshArrayBuffer } from './services/services';

import type { VisibleRegion } from './types';

const region: VisibleRegion = {
  id: 'cerebrum',
  name: 'Cerebrum',
  color: { color: 'mock' } as never,
};

/** Drain macrotasks until the suspended GLB `parse` is reached (bounded). */
async function waitForParse() {
  for (let i = 0; i < 50 && !h.resolveParse && !h.rejectParse; i += 1) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
}

/**
 * Arrange a started painter that is mid-mesh-load: it has dispatched listeners
 * wired up and a `setRegions` call in flight, suspended on the GLB `parse`.
 * Callers `await waitForParse()` then drive the teardown/resolve they're testing.
 */
function startMeshLoad() {
  const painter = new Painter('atlas-2', {} as never);
  const dispatched: unknown[] = [];
  painter.eventError.addListener((message) => dispatched.push(message));

  painter.start({} as HTMLCanvasElement);

  // Mesh load starts; it suspends on the network fetch, then on `TgdDataGlb.parse`.
  const pending = painter.setRegions([region], 'access-token');
  return { painter, dispatched, pending };
}

describe('Painter.setRegions — context teardown race (issue #490)', () => {
  beforeEach(() => {
    h.resolveParse = null;
    h.rejectParse = null;
    h.xrayContexts.length = 0;
    h.logError.mockClear();
  });

  it('does not use a deleted context or show a popup when a mesh load resolves after a restart', async () => {
    const { painter, dispatched, pending } = startMeshLoad();
    await waitForParse();
    expect(h.resolveParse).not.toBeNull();

    // Simulate navigating between tabs: cleanup tears the canvas down and the
    // remount creates a fresh context — deleting the context the load captured.
    painter.start(null);
    painter.start({} as HTMLCanvasElement);

    // The in-flight parse now resolves against the stale (deleted) context.
    h.resolveParse?.({ getJson: () => ({}) });
    await pending;

    expect(dispatched).toEqual([]);
    expect(h.xrayContexts.some((context) => context.deleted)).toBe(false);
    expect(h.logError).not.toHaveBeenCalled();
  });

  it('still surfaces a popup when a mesh genuinely fails on the current live context', async () => {
    const { dispatched, pending } = startMeshLoad();
    await waitForParse();

    // No teardown: the context stays live and the GLB simply fails to parse
    // (e.g. a corrupt mesh). The guard must NOT swallow this — the user sees it.
    h.rejectParse?.(new Error('corrupt GLB'));
    await pending;

    expect(dispatched).toEqual(['Unable to load mesh for region "Cerebrum"!']);
    expect(h.logError).toHaveBeenCalled();
  });

  it('logs but does not show a popup when a region has no mesh in the atlas', async () => {
    // "grooves" case: the region is selectable in the hierarchy tree but has no
    // brain-atlas-region mesh entity, so the fetch rejects before any GLB parse.
    vi.mocked(getCachedBrainRegionMeshArrayBuffer).mockRejectedValueOnce(
      new RegionMeshNotAvailableError(region.id, 'atlas-2', 'no mesh')
    );

    const { dispatched, pending } = startMeshLoad();
    await pending;

    expect(dispatched).toEqual([]);
    expect(h.logError).toHaveBeenCalled();
  });

  it('still surfaces a popup when the fetch fails with a non-mesh-availability error', async () => {
    // A genuine transient failure (not the typed no-mesh error) must NOT be
    // swallowed by the suppression branch — the user still sees the popup.
    vi.mocked(getCachedBrainRegionMeshArrayBuffer).mockRejectedValueOnce(new Error('network down'));

    const { dispatched, pending } = startMeshLoad();
    await pending;

    expect(dispatched).toHaveLength(1);
    expect(h.logError).toHaveBeenCalled();
  });
});
