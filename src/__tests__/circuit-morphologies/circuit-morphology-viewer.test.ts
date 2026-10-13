// @vitest-environment jsdom
import chroma from 'chroma-js';
import * as THREE from 'three';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { CircuitMorphologyViewer } from '@/features/circuit-viewer/morphologies/engine/circuit-morphology-viewer';
import { PLAIN } from '@/features/viewer-3d/engine/looks';

import type { ImpostorUniforms } from '@/features/circuit-viewer/morphologies/engine/impostors';
import type { CircuitMorphologyData } from '@/features/circuit-viewer/morphologies/types';
import type { Look } from '@/features/viewer-3d/engine/looks';

const { FakeRenderer } = vi.hoisted(() => {
  /** Draws nothing; it keeps what it was made with and counts the frames asked of it. */
  class FakeRenderer {
    domElement = document.createElement('canvas');
    loop: (() => void) | null = null;
    render = vi.fn();

    constructor(readonly parameters: WebGLContextAttributes) {}

    setAnimationLoop(loop: (() => void) | null): void {
      this.loop = loop;
    }

    getPixelRatio(): number {
      return 1;
    }

    setPixelRatio(): void {}
    setClearColor(): void {}
    setSize(): void {}
    dispose(): void {}
    forceContextLoss(): void {}
  }
  return { FakeRenderer };
});

vi.mock('three', async (importOriginal) => ({
  ...(await importOriginal<typeof import('three')>()),
  WebGLRenderer: FakeRenderer,
}));

interface Internals {
  renderer: InstanceType<typeof FakeRenderer>;
  main: unknown;
  chunks: THREE.Group;
  surfaces: THREE.Scene;
  bounds: THREE.Box3;
  look: Look;
  uniforms: ImpostorUniforms;
  somaMaterial: THREE.Material;
}

type Quads = THREE.Mesh<THREE.InstancedBufferGeometry>;

let viewers: CircuitMorphologyViewer[] = [];

function make(): { viewer: CircuitMorphologyViewer; inner: Internals; host: HTMLElement } {
  const host = document.body.appendChild(document.createElement('div'));
  Object.defineProperties(host, { clientWidth: { value: 400 }, clientHeight: { value: 300 } });
  const viewer = new CircuitMorphologyViewer(host);
  viewers.push(viewer);
  return { viewer, inner: viewer as unknown as Internals, host };
}

/** Two segments of cells 0 and 2, and three cells, the second with no position. */
function circuit(): CircuitMorphologyData {
  return {
    segments: Float32Array.of(0, 0, 0, 1, 10, 0, 0, 1, 10, 20, 0, 4, 10, 30, 0, 0.5),
    segmentCells: Uint32Array.of(0, 2),
    segmentTypes: Uint8Array.of(3, 2),
    somas: Float32Array.of(0, 0, 0, 5, NaN, NaN, NaN, 0, 10, 20, 0, 4),
    populations: [{ name: 'neurons', cells: 3 }],
    centre: [100, 200, 300],
    bounds: { min: [-5, -5, -5], max: [15, 30, 5] },
    level: { toleranceUm: 0.125, pruneUm: 0 },
  };
}

const segmentsOf = (inner: Internals) => inner.chunks.children[0] as Quads;
const somasOf = (inner: Internals) =>
  inner.surfaces.children.find((o) => o instanceof THREE.Mesh) as Quads;
const texel = (inner: Internals, cell: number) => {
  const { data } = (inner.uniforms.uCells.value as THREE.DataTexture).image;
  return [...(data as Uint8Array).subarray(4 * cell, 4 * cell + 4)];
};
const rgb = (hex: string) => chroma(hex).rgb();
/** The frames drawn by letting the loop turn once, if it is on. */
function frames(inner: Internals): number {
  inner.renderer.render.mockClear();
  inner.renderer.loop?.();
  return inner.renderer.render.mock.calls.length;
}

beforeAll(() => {
  // The matcaps are drawn on a 2D canvas, which jsdom lacks; a stub is enough to build them.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createRadialGradient: () => ({ addColorStop() {} }),
    fillRect() {},
  } as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  for (const v of viewers) v.dispose();
  viewers = [];
  document.body.replaceChildren();
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('the circuit morphology viewer', () => {
  it('draws straight to an antialiased canvas, on the faster GPU where there are two', () => {
    const { inner } = make();
    expect(inner.renderer.parameters).toMatchObject({
      antialias: true,
      depth: true,
      powerPreference: 'high-performance',
    });
    expect(inner.main).toBeNull();
  });

  it('has the Studio look and no other', () => {
    const { viewer, inner } = make();
    expect(viewer.looks.map((l) => l.id)).toEqual(['studio']);
    expect(inner.look).toBe(viewer.looks[0]);
    expect(() => viewer.setLook('flat')).toThrow('unknown look "flat"');
  });

  it("has the circuit viewer's flat background of the theme in place of Studio's gradient", () => {
    const { viewer, host } = make();
    const white = 'linear-gradient(rgb(255, 255, 255), rgb(255, 255, 255))';
    const black = 'linear-gradient(rgb(0, 0, 0), rgb(0, 0, 0))';
    expect(host.style.background).toBe(white);
    viewer.setDark(true);
    expect(host.style.background).toBe(black);
    viewer.setLook('studio');
    expect(host.style.background).toBe(black);
    viewer.setDark(false);
    expect(host.style.background).toBe(white);
  });

  it('takes a snapshot of a frame drawn for it, over the background of the theme', () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    viewer.setDark(true);
    frames(inner);
    const frame = inner.renderer.domElement;
    frame.width = 800;
    frame.height = 600;
    const steps: string[] = [];
    const context = {
      fillStyle: '',
      fillRect: (...box: number[]) => steps.push(`fill ${context.fillStyle} ${box.join(' ')}`),
      drawImage: (source: unknown, ...at: number[]) =>
        steps.push(`copy ${source === frame ? 'frame' : 'other'} ${at.join(' ')}`),
    };
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValueOnce(
      context as unknown as CanvasRenderingContext2D
    );
    inner.renderer.render.mockImplementation(() => steps.push('draw'));

    const shot = viewer.snapshot();

    expect(shot).toBeInstanceOf(HTMLCanvasElement);
    expect([shot?.width, shot?.height]).toEqual([800, 600]);
    expect(steps).toEqual(['fill #000000 0 0 800 600', 'draw', 'copy frame 0 0']);
  });

  it('has no snapshot where the browser gives no 2D canvas', () => {
    const { viewer, inner } = make();
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValueOnce(null);

    expect(viewer.snapshot()).toBeNull();
    expect(inner.renderer.render).not.toHaveBeenCalled();
  });

  it("draws a quad a segment in the look's material, from the reader's arrays as they are", () => {
    const { viewer, inner } = make();
    const data = circuit();
    viewer.setData(data);
    const segments = segmentsOf(inner);
    expect(segments.material).toBe(inner.look.material);
    expect(inner.look.material.customProgramCacheKey()).toContain('impostor-segment');
    expect(segments.frustumCulled).toBe(false);
    const { geometry } = segments;
    expect(geometry.instanceCount).toBe(2);
    expect(geometry.index?.count).toBe(6);
    const a = geometry.getAttribute('aA') as THREE.InterleavedBufferAttribute;
    const b = geometry.getAttribute('aB') as THREE.InterleavedBufferAttribute;
    expect(a.data).toBeInstanceOf(THREE.InstancedInterleavedBuffer);
    expect(a.data.array).toBe(data.segments);
    expect(b.data).toBe(a.data);
    expect([a.data.stride, a.itemSize, a.offset, b.itemSize, b.offset]).toEqual([8, 4, 0, 4, 4]);
    const cell = geometry.getAttribute('aCell') as THREE.InstancedBufferAttribute;
    expect(cell).toBeInstanceOf(THREE.InstancedBufferAttribute);
    expect(cell.array).toBe(data.segmentCells);
    // Kept once uploaded, for three to upload again after a lost context.
    a.data.onUploadCallback();
    cell.onUploadCallback();
    expect(a.data.array).toBe(data.segments);
    expect(cell.array).toBe(data.segmentCells);
  });

  it("draws a quad a soma that has a position, in a copy of the look's material", () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    const somas = somasOf(inner);
    expect(somas.material).toBe(inner.somaMaterial);
    expect(somas.material).not.toBe(inner.look.material);
    expect(inner.somaMaterial.customProgramCacheKey()).toContain('impostor-soma');
    expect(somas.geometry.instanceCount).toBe(2);
    expect([...somas.geometry.getAttribute('aSoma').array]).toEqual([0, 0, 0, 5, 10, 20, 0, 4]);
    expect([...somas.geometry.getAttribute('aCell').array]).toEqual([0, 2]);
  });

  it('keeps the somas their own material when the look is applied again', () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    viewer.setLook('studio');
    expect(somasOf(inner).material).toBe(inner.somaMaterial);
    expect(segmentsOf(inner).material).toBe(inner.look.material);
  });

  it("frames the view on the data's bounds", () => {
    const { viewer, inner } = make();
    const reset = vi.spyOn(viewer, 'resetView');
    viewer.setData(circuit());
    expect(reset).toHaveBeenCalledTimes(1);
    expect(inner.bounds.min.toArray()).toEqual([-5, -5, -5]);
    expect(inner.bounds.max.toArray()).toEqual([15, 30, 5]);
    expect(frames(inner)).toBe(1);
  });

  it("hands the shaders a texel a cell, in the theme's own colour until the cells are coloured", () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    expect((inner.uniforms.uCells.value as THREE.DataTexture).image.width).toBe(2048);
    for (const cell of [0, 1, 2]) expect(texel(inner, cell)).toEqual([...rgb(PLAIN.light), 255]);

    frames(inner);
    viewer.setCellColors({ palette: ['#ff0000', false], columnByCell: Uint16Array.of(0, 1, 1) });
    expect(texel(inner, 0)).toEqual([255, 0, 0, 255]);
    expect(texel(inner, 2)[3]).toBe(0);
    expect(frames(inner)).toBe(1);

    viewer.setCellColors(null);
    viewer.setDark(true);
    for (const cell of [0, 1, 2]) expect(texel(inner, cell)).toEqual([...rgb(PLAIN.dark), 255]);
    expect(frames(inner)).toBe(1);
  });

  it('paints the data that comes after the colours and the theme with them', () => {
    const { viewer, inner } = make();
    viewer.setDark(true);
    viewer.setCellColors({ palette: [null, '#00ff00'], columnByCell: Uint16Array.of(0, 1, 1) });
    viewer.setData(circuit());
    expect(texel(inner, 0)).toEqual([...rgb(PLAIN.dark), 255]);
    expect(texel(inner, 1)).toEqual([0, 255, 0, 255]);
  });

  it('draws neither segments nor somas where the data has none', () => {
    const { viewer, inner } = make();
    viewer.setData({
      ...circuit(),
      segments: new Float32Array(0),
      segmentCells: new Uint32Array(0),
      segmentTypes: new Uint8Array(0),
      somas: Float32Array.of(NaN, NaN, NaN, 0),
    });
    expect(segmentsOf(inner).visible).toBe(false);
    expect(somasOf(inner).visible).toBe(false);
  });

  it('frees the geometries and the cell table of the data it had, for other data and for none', () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    const disposed = () => {
      const table = inner.uniforms.uCells.value as THREE.DataTexture;
      return [segmentsOf(inner).geometry, somasOf(inner).geometry, table].map((o) =>
        vi.spyOn(o, 'dispose')
      );
    };
    const first = disposed();
    viewer.setData(circuit());
    for (const dispose of first) expect(dispose).toHaveBeenCalledTimes(1);
    expect(inner.chunks.children).toHaveLength(1);

    const second = disposed();
    frames(inner);
    viewer.setData(null);
    for (const dispose of second) expect(dispose).toHaveBeenCalledTimes(1);
    expect(inner.chunks.children).toHaveLength(0);
    expect(somasOf(inner)).toBeUndefined();
    expect(inner.uniforms.uCells.value).toBeNull();
    expect(frames(inner)).toBe(1);
  });

  it('frees what it holds when it is disposed of', () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    const freed = [
      segmentsOf(inner).geometry,
      somasOf(inner).geometry,
      inner.uniforms.uCells.value as THREE.DataTexture,
      inner.somaMaterial,
      inner.look.material,
    ].map((o) => vi.spyOn(o, 'dispose'));
    viewer.dispose();
    viewers = [];
    for (const dispose of freed) expect(dispose).toHaveBeenCalledTimes(1);
  });
});
