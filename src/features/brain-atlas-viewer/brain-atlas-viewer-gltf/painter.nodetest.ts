import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

describe('Painter.setPointCloud', () => {
  it('does not use a deleted context when point cloud data resolves after a restart', async () => {
    let resolvePointCloud!: (value: Float32Array) => void;
    const textureContexts: Array<{ id: number; deleted: boolean }> = [];
    const logErrors: unknown[] = [];

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

    mock.module('@tolokoban/tgd', {
      namedExports: {
        TgdContext: FakeContext,
        TgdPainterGroup: FakeGroup,
        TgdPainterPointsCloud: FakePainterPointsCloud,
        TgdTexture2D: FakeTexture2D,
        TgdDataGlb: class {},
        TgdGeometryGltf: class {},
        TgdPainterClear: class {},
        TgdPainterState: class {},
        TgdPainterXRay: class {},
        tgdCanvasCreateFill: () => ({}),
        webglPresetDepth: { lessOrEqual: 'lessOrEqual' },
      },
    });

    mock.module('./camera', {
      namedExports: {
        setCamera: () => ({
          resetCamera: () => undefined,
          fitToBounds: () => undefined,
        }),
      },
    });

    mock.module('./hooks', {
      namedExports: {
        makeColor: () => ({ color: 'mock' }),
      },
    });

    mock.module('./services/services', {
      namedExports: {
        getCachedBrainRegionMeshArrayBuffer: async () => new ArrayBuffer(0),
        getPointCouldData: () =>
          new Promise<Float32Array>((resolve) => {
            resolvePointCloud = resolve;
          }),
      },
    });

    mock.module('@/config', {
      namedExports: {
        config: {
          MOUSE_ATLAS__ID: 'atlas-1',
        },
      },
    });

    mock.module('@/util/logger', {
      namedExports: {
        logError: (...args: unknown[]) => {
          logErrors.push(args);
        },
      },
    });

    const { Painter } = await import('./painter');

    const painter = new Painter('atlas-1', {} as never);
    painter.start({} as HTMLCanvasElement);

    const pendingPointCloud = painter.setPointCloud(8, '#FFFFFF', 'access-token');

    painter.start(null);
    painter.start({} as HTMLCanvasElement);

    resolvePointCloud(new Float32Array([1, 2, 3, 4]));
    await pendingPointCloud;

    assert.equal(logErrors.length, 0);
    assert.equal(
      textureContexts.some((context) => context.deleted),
      false,
      'point cloud textures should only be created against a live TgdContext'
    );
  });
});
