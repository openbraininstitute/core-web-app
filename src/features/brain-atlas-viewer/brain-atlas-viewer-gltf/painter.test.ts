import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const textureContexts: Array<{ id: number; deleted: boolean }> = [];
  const logErrors: unknown[] = [];
  const pointCloudResolver: { resolve: ((value: Float32Array) => void) | null } = {
    resolve: null,
  };

  class FakeContext {
    static nextId = 1;

    public readonly id = FakeContext.nextId++;

    public deleted = false;

    public readonly logic = {
      add: () => undefined,
    };

    delete() {
      this.deleted = true;
    }

    add() {
      return undefined;
    }

    paint() {
      return undefined;
    }
  }

  class FakeGroup {
    add() {
      return undefined;
    }

    remove() {
      return undefined;
    }
  }

  class FakeTexture2D {
    constructor(context: FakeContext) {
      textureContexts.push({ id: context.id, deleted: context.deleted });
      if (context.deleted) {
        throw new Error(`[TgdContext] This context has been deleted: Context#${context.id}!`);
      }
    }

    loadBitmap() {
      return this;
    }
  }

  class FakePainterPointsCloud {
    delete() {
      return undefined;
    }
  }

  return {
    textureContexts,
    logErrors,
    pointCloudResolver,
    FakeContext,
    FakeGroup,
    FakeTexture2D,
    FakePainterPointsCloud,
  };
});

vi.mock('@tolokoban/tgd', () => ({
  TgdContext: hoisted.FakeContext,
  TgdPainterGroup: hoisted.FakeGroup,
  TgdPainterPointsCloud: hoisted.FakePainterPointsCloud,
  TgdTexture2D: hoisted.FakeTexture2D,
  TgdDataGlb: class {},
  TgdGeometryGltf: class {},
  TgdPainterClear: class {},
  TgdPainterState: class {},
  TgdPainterXRay: class {},
  tgdCanvasCreateFill: () => ({}),
  webglPresetDepth: { lessOrEqual: 'lessOrEqual' },
}));

vi.mock('./camera', () => ({
  setCamera: () => ({
    resetCamera: () => undefined,
    fitToBounds: () => undefined,
  }),
}));

vi.mock('./hooks', () => ({
  makeColor: () => ({ color: 'mock' }),
}));

vi.mock('./services/services', () => ({
  getCachedBrainRegionMeshArrayBuffer: async () => new ArrayBuffer(0),
  getPointCouldData: () =>
    new Promise<Float32Array>((resolve) => {
      hoisted.pointCloudResolver.resolve = resolve;
    }),
}));

vi.mock('@/config', () => ({
  config: {
    MOUSE_ATLAS__ID: 'atlas-1',
  },
}));

vi.mock('@/utils/logger', () => ({
  logError: (...args: unknown[]) => {
    hoisted.logErrors.push(args);
  },
}));

describe('Painter.setPointCloud', () => {
  it('does not use a deleted context when point cloud data resolves after a restart', async () => {
    const { Painter } = await import('./painter');

    const painter = new Painter('atlas-1', {} as never);
    painter.start({} as HTMLCanvasElement);

    const pendingPointCloud = painter.setPointCloud(8, '#FFFFFF', 'access-token');

    painter.start(null);
    painter.start({} as HTMLCanvasElement);

    hoisted.pointCloudResolver.resolve?.(new Float32Array([1, 2, 3, 4]));
    await pendingPointCloud;

    expect(hoisted.logErrors.length).toBe(0);
    expect(hoisted.textureContexts.some((context) => context.deleted)).toBe(false);
  });
});
