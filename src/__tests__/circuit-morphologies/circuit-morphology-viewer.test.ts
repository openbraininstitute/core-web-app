// @vitest-environment jsdom
import chroma from 'chroma-js';
import * as THREE from 'three';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { CircuitMorphologyViewer } from '@/features/circuit-viewer/morphologies/engine/circuit-morphology-viewer';
import { NO_CELL } from '@/features/circuit-viewer/morphologies/engine/impostors';
import { DEFAULT_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';

import type { ImpostorUniforms } from '@/features/circuit-viewer/morphologies/engine/impostors';
import type { SomaCloudUniforms } from '@/features/circuit-viewer/morphologies/engine/soma-cloud';
import type {
  CellColors,
  CircuitMorphologyData,
  CircuitSomas,
  ElectrodeGroup,
} from '@/features/circuit-viewer/morphologies/types';
import type { Look } from '@/features/viewer-3d/engine/looks';

const { FakeRenderer } = vi.hoisted(() => {
  /** Draws nothing; it keeps what it was made with and counts the frames asked of it. */
  class FakeRenderer {
    domElement = document.createElement('canvas');
    loop: (() => void) | null = null;
    pixelRatio = 1;
    render = vi.fn();
    compile = vi.fn();
    setRenderTarget = vi.fn();
    /** Answers with the pixels it was given to fill, all zeros unless a test draws in them. */
    readRenderTargetPixelsAsync = vi.fn(
      async (
        _target: unknown,
        _x: number,
        _y: number,
        _w: number,
        _h: number,
        pixels: Uint8Array
      ) => pixels
    );

    constructor(readonly parameters: WebGLContextAttributes) {}

    setAnimationLoop(loop: (() => void) | null): void {
      this.loop = loop;
    }

    getPixelRatio(): number {
      return this.pixelRatio;
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
  cloud: { mesh: Quads; ids: Quads } | null;
  cloudMaterial: THREE.ShaderMaterial;
  cloudUniforms: SomaCloudUniforms;
  ids: THREE.Scene;
  idMaterials: {
    segment: THREE.ShaderMaterial;
    soma: THREE.ShaderMaterial;
    cloud: THREE.ShaderMaterial;
  };
  idTarget: THREE.WebGLRenderTarget | null;
  controls: { target: THREE.Vector3 };
  centre: [number, number, number];
  camera: THREE.Camera;
  scene: THREE.Scene;
  electrodeMaterial: THREE.ShaderMaterial;
  electrodes: Quads | null;
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
  inner.surfaces.children.find(
    (o) => o instanceof THREE.Mesh && o.material === inner.somaMaterial
  ) as Quads;
const texel = (inner: Internals, cell: number) => {
  const { data } = (inner.uniforms.uCells.value as THREE.DataTexture).image;
  return [...(data as Uint8Array).subarray(4 * cell, 4 * cell + 4)];
};
const rgb = (hex: string) => chroma(hex).rgb();
const rounded = (values: ArrayLike<number>) =>
  Array.from(values, (value) => Math.round(value * 1000) / 1000);
/** A colour as the shaders take it as it is, in sRGB from 0 to 1. */
const sRGB = (hex: string) => rounded(rgb(hex).map((c) => c / 255));

/** Array A's two contacts and array B's one, in the circuit's frame: around the centre of `circuit()`. */
function arrays(): ElectrodeGroup[] {
  return [
    { id: 'A', color: '#1b6ef3', coordinates: Float32Array.of(110, 220, 300, 100, 200, 300) },
    { id: 'B', color: '#12a150', coordinates: Float32Array.of(95, 190, 300) },
  ];
}
const contactsOf = (inner: Internals) => inner.electrodes?.geometry.getAttribute('aContact').array;
const looksOf = (inner: Internals) => inner.electrodes?.geometry.getAttribute('aLook').array;
/** A point of the circuit as the view has it, the centre of `circuit()` taken off. */
const centred = (point: ArrayLike<number>) =>
  new THREE.Vector3(point[0] - 100, point[1] - 200, point[2] - 300);
/** Where the view draws a point of the circuit, in CSS pixels of its 400 by 300. */
function drawnAt(inner: Internals, point: [number, number, number]): [number, number] {
  inner.camera.updateMatrixWorld();
  const ndc = centred(point).project(inner.camera);
  return [((ndc.x + 1) / 2) * 400, ((1 - ndc.y) / 2) * 300];
}
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

  it('hands the shaders a texel a cell, in the default colour until the cells are coloured', () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    expect((inner.uniforms.uCells.value as THREE.DataTexture).image.width).toBe(2048);
    for (const cell of [0, 1, 2]) {
      expect(texel(inner, cell)).toEqual([...rgb(DEFAULT_NEURON_COLOR), 255]);
    }

    frames(inner);
    viewer.setCellColors({ palette: ['#ff0000', false], columnByCell: Uint16Array.of(0, 1, 1) });
    expect(texel(inner, 0)).toEqual([255, 0, 0, 255]);
    expect(texel(inner, 2)[3]).toBe(0);
    expect(frames(inner)).toBe(1);

    viewer.setCellColors(null);
    frames(inner);
    viewer.setDefaultColor('#8899aa');
    for (const cell of [0, 1, 2]) expect(texel(inner, cell)).toEqual([...rgb('#8899aa'), 255]);
    expect(frames(inner)).toBe(1);

    viewer.setDefaultColor('#8899aa');
    expect(frames(inner)).toBe(0);
  });

  it('paints the data that comes after the colours with them', () => {
    const { viewer, inner } = make();
    viewer.setDefaultColor('#8899aa');
    viewer.setCellColors({ palette: [null, '#00ff00'], columnByCell: Uint16Array.of(0, 1, 1) });
    viewer.setData(circuit());
    expect(texel(inner, 0)).toEqual([...rgb('#8899aa'), 255]);
    expect(texel(inner, 1)).toEqual([0, 255, 0, 255]);
  });

  it('draws one cell highlighted, in a colour as far from the background as no palette goes', () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    const { uHighlighted, uHighlight } = inner.uniforms;
    expect(uHighlighted.value).toBe(NO_CELL);
    expect(uHighlight.value.getHexString()).toBe('1a1a1a');

    frames(inner);
    viewer.setHighlight(2);
    expect(uHighlighted.value).toBe(2);
    expect(frames(inner)).toBe(1);
    // Told of the same cell again, as a pointer that rests on it does, it draws nothing.
    viewer.setHighlight(2);
    expect(frames(inner)).toBe(0);

    viewer.setDark(true);
    expect(uHighlight.value.getHexString()).toBe('ffffff');
    expect(frames(inner)).toBe(1);

    viewer.setHighlight(null);
    expect(uHighlighted.value).toBe(NO_CELL);
    expect(frames(inner)).toBe(1);
  });

  it('highlights no cell of the data that comes next, whose cells are others', () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    viewer.setHighlight(2);
    viewer.setData(circuit());
    expect(inner.uniforms.uHighlighted.value).toBe(NO_CELL);
  });

  it("has the same quads in their cells' numbers, in a scene that no frame draws", () => {
    const { viewer, inner } = make();
    const steps: string[] = [];
    inner.renderer.setRenderTarget.mockImplementation((target: THREE.WebGLRenderTarget | null) =>
      steps.push(target ? `into ${target.width}x${target.height}` : 'back to the canvas')
    );
    inner.renderer.compile.mockImplementation(() => steps.push('build'));
    viewer.setData(circuit());
    const [segments, somas] = inner.ids.children as Quads[];
    expect(inner.ids.children).toHaveLength(2);
    expect(inner.ids.parent).toBeNull();
    expect(segments.geometry).toBe(segmentsOf(inner).geometry);
    expect(segments.material).toBe(inner.idMaterials.segment);
    expect(somas.geometry).toBe(somasOf(inner).geometry);
    expect(somas.material).toBe(inner.idMaterials.soma);
    for (const quads of [segments, somas]) expect(quads.frustumCulled).toBe(false);
    expect(inner.idMaterials.soma.uniforms.uCells).toBe(inner.uniforms.uCells);
    // Built with the data, ahead of the first pick, for the target a pick draws into.
    expect(inner.renderer.compile).toHaveBeenCalledExactlyOnceWith(inner.ids, inner.camera);
    expect(steps).toEqual(['into 9x9', 'build', 'back to the canvas']);

    viewer.setData(null);
    expect(inner.ids.children).toHaveLength(0);
  });

  it('picks the cell drawn at a point from the device pixels within 4 CSS pixels of it, drawn in numbers for it', async () => {
    const { viewer, inner } = make();
    const { renderer } = inner;
    renderer.domElement.width = 800;
    renderer.domElement.height = 600;
    renderer.pixelRatio = 2;
    viewer.setData(circuit());
    const steps: string[] = [];
    renderer.setRenderTarget.mockImplementation((target: THREE.WebGLRenderTarget | null) =>
      steps.push(
        target
          ? `into ${target.width}x${target.height}, the view at ${target.viewport.toArray()}`
          : 'back to the canvas'
      )
    );
    renderer.render.mockImplementation((scene: THREE.Scene) =>
      steps.push(scene === inner.ids ? 'draw the numbers' : 'draw the scene')
    );
    renderer.readRenderTargetPixelsAsync.mockImplementation(async (_target, x, y, w, h, pixels) => {
      steps.push(`read ${[x, y, w, h]}`);
      // Cell 2, in the middle pixel of 17 by 17.
      new DataView(pixels.buffer).setUint32(4 * (8 * 17 + 8), 3, true);
      return pixels;
    });

    // 100.4 CSS pixels across is device pixel 200, and 50 down is 100: row 499 from the bottom of 600.
    await expect(viewer.pick(100.4, 50)).resolves.toBe(2);

    expect(steps).toEqual([
      'into 17x17, the view at -192,-491,800,600',
      'draw the numbers',
      'back to the canvas',
      'read 0,0,17,17',
    ]);
  });

  it('picks with the camera where it is, drawn there yet or not', async () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    frames(inner);
    inner.camera.position.x += 7;
    expect(inner.camera.matrixWorld.elements[12]).not.toBe(inner.camera.position.x);
    let drawnWith = Number.NaN;
    inner.renderer.render.mockImplementation((_scene: unknown, camera: THREE.Camera) => {
      drawnWith = camera.matrixWorld.elements[12];
    });

    await viewer.pick(10, 10);

    expect(drawnWith).toBe(inner.camera.position.x);
  });

  it('finds no cell where none is drawn, nor without data, which it draws nothing for', async () => {
    const { viewer, inner } = make();
    await expect(viewer.pick(10, 10)).resolves.toBeNull();
    expect(inner.renderer.render).not.toHaveBeenCalled();

    viewer.setData(circuit());
    await expect(viewer.pick(10, 10)).resolves.toBeNull();
    expect(inner.renderer.readRenderTargetPixelsAsync).toHaveBeenCalledTimes(1);
  });

  it('finds no cell once other data is shown, nor when the pixels cannot be read', async () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    const read = inner.renderer.readRenderTargetPixelsAsync;
    const drawn = async (...args: Parameters<typeof read>) => {
      const pixels = args[5];
      pixels[4 * 40] = 1;
      return pixels;
    };
    read.mockImplementationOnce(drawn);
    await expect(viewer.pick(10, 10)).resolves.toBe(0);
    expect(inner.idTarget?.width).toBe(9);

    read.mockImplementationOnce(drawn);
    const late = viewer.pick(10, 10);
    viewer.setData(circuit());
    await expect(late).resolves.toBeNull();

    read.mockRejectedValueOnce(new Error('context lost'));
    await expect(viewer.pick(10, 10)).resolves.toBeNull();
  });

  it('draws electrodes after the cells and over them, centred as the data is, in their colours as given', () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    viewer.setElectrodes(arrays(), null);

    const mesh = inner.electrodes as Quads;
    expect(mesh.parent).toBe(inner.scene);
    expect(mesh.renderOrder).toBe(1);
    expect(mesh.frustumCulled).toBe(false);
    expect(mesh.material).toBe(inner.electrodeMaterial);
    expect(inner.electrodeMaterial.depthTest).toBe(false);
    expect(inner.electrodeMaterial.depthWrite).toBe(false);
    expect(mesh.geometry.instanceCount).toBe(3);
    expect(rounded(contactsOf(inner) ?? [])).toEqual([10, 20, 0, 0, 0, 0, -5, -10, 0]);
    // In sRGB as the host has them, which the shader writes as they are.
    expect(rounded(looksOf(inner) ?? [])).toEqual([
      ...sRGB('#1b6ef3'),
      1,
      ...sRGB('#1b6ef3'),
      1,
      ...sRGB('#12a150'),
      1,
    ]);
  });

  it('draws the highlighted array half again as large, and nearer white', () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    viewer.setElectrodes(arrays(), 'B');

    const looks = rounded(looksOf(inner) ?? []);
    const plain = [...sRGB('#1b6ef3'), 1];
    const lighter = rounded(rgb('#12a150').map((c) => c / 255 + (1 - c / 255) * 0.55));
    expect(looks).toEqual([...plain, ...plain, ...lighter, 1.55]);
  });

  it('draws a contact in grey where its colour cannot be read', () => {
    const { viewer, inner } = make();
    const unreadable = { id: 'A', color: 'no colour', coordinates: Float32Array.of(100, 200, 300) };

    viewer.setElectrodes([unreadable], null);

    expect(rounded(looksOf(inner) ?? [])).toEqual([...sRGB('#808080'), 1]);
  });

  it("places electrodes it was given before the data around the data's centre once it comes", () => {
    const { viewer, inner } = make();
    viewer.setElectrodes(arrays(), null);
    expect(rounded(contactsOf(inner) ?? []).slice(0, 3)).toEqual([110, 220, 300]);

    viewer.setData(circuit());
    expect(rounded(contactsOf(inner) ?? []).slice(0, 3)).toEqual([10, 20, 0]);

    frames(inner);
    viewer.setElectrodes(arrays(), 'A');
    expect(frames(inner)).toBe(1);
  });

  it('keeps its mesh while the contacts fit in it, and makes a larger one when they do not', () => {
    const { viewer, inner } = make();
    viewer.setElectrodes(arrays(), null);
    const first = inner.electrodes as Quads;
    const dispose = vi.spyOn(first.geometry, 'dispose');

    viewer.setElectrodes(arrays().slice(0, 1), 'A');
    expect(inner.electrodes).toBe(first);
    expect(first.geometry.instanceCount).toBe(2);

    viewer.setElectrodes([], null);
    expect(inner.electrodes).toBe(first);
    expect(first.visible).toBe(false);

    viewer.setElectrodes(arrays(), null);
    expect(inner.electrodes).toBe(first);
    expect(first.visible).toBe(true);
    expect(first.geometry.instanceCount).toBe(3);
    expect(dispose).not.toHaveBeenCalled();

    const more = { id: 'C', color: '#d43c3c', coordinates: Float32Array.of(100, 200, 300) };
    viewer.setElectrodes([...arrays(), more], null);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(first.parent).toBeNull();
    expect(inner.electrodes?.geometry.instanceCount).toBe(4);
  });

  it('draws contacts as wide as the radius setting, and a pixel or more across at the least', () => {
    const { viewer, inner } = make();
    const { uRadius, uMinRadius, uViewport } = inner.electrodeMaterial.uniforms;
    expect(uViewport).toBe(inner.uniforms.uViewport);

    frames(inner);
    viewer.setElectrodeRadius(5);
    expect(uRadius.value).toBe(5);
    expect(uMinRadius.value).toBe(1);
    // None are drawn yet.
    expect(frames(inner)).toBe(0);

    viewer.setElectrodes(arrays(), null);
    frames(inner);
    viewer.setElectrodeRadius(20);
    expect(uRadius.value).toBe(20);
    expect(uMinRadius.value).toBe(3);
    expect(frames(inner)).toBe(1);
  });

  it('draws no frame for a highlight where there are no electrodes', () => {
    const { viewer, inner } = make();
    viewer.setElectrodes([], null);
    expect(inner.electrodes).toBeNull();

    frames(inner);
    viewer.setElectrodes([], 'A');
    expect(frames(inner)).toBe(0);
  });

  it('draws no frame and uploads nothing for electrodes as they are drawn already', () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    viewer.setElectrodes(arrays(), 'A');
    const contacts = inner.electrodes?.geometry.getAttribute('aContact') as THREE.BufferAttribute;
    const version = contacts.version;

    frames(inner);
    viewer.setElectrodes(arrays(), 'A');
    expect(frames(inner)).toBe(0);
    expect(contacts.version).toBe(version);

    viewer.setElectrodes(arrays().slice(0, 1), 'A');
    expect(frames(inner)).toBe(1);
  });

  it('finds the electrode at a point of the view, or the nearest contact within 7 pixels', () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    // Contacts too small to see: the reach is all there is to them.
    viewer.setElectrodeRadius(0.001);
    viewer.setElectrodes(arrays(), null);
    const [x, y] = drawnAt(inner, [95, 190, 300]);

    expect(viewer.electrodeAt(x, y)).toEqual({ id: 'B', contact: [95, 190, 300] });
    expect(viewer.electrodeAt(x + 6, y)).toEqual({ id: 'B', contact: [95, 190, 300] });
    expect(viewer.electrodeAt(x + 8, y)).toBeNull();
    expect(viewer.electrodeAt(...drawnAt(inner, [100, 200, 300]))).toEqual({
      id: 'A',
      contact: [100, 200, 300],
    });
  });

  it("finds a contact within its drawn radius, the highlighted array's half again as wide", () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    viewer.setElectrodeRadius(3);
    viewer.setElectrodes(arrays(), null);
    const [x, y] = drawnAt(inner, [95, 190, 300]);
    const perUm = drawnAt(inner, [96, 190, 300])[0] - x;
    // Wider than the reach any contact has.
    expect(3 * perUm).toBeGreaterThan(7);

    // The disc and the ring's pixel round it.
    expect(viewer.electrodeAt(x + 3 * perUm + 0.9, y)?.id).toBe('B');
    expect(viewer.electrodeAt(x + 3 * perUm + 1.1, y)).toBeNull();
    viewer.setElectrodes(arrays(), 'B');
    expect(viewer.electrodeAt(x + 4.6 * perUm, y)?.id).toBe('B');
  });

  it("rings each contact in the theme's foreground, a CSS pixel wide on any screen", () => {
    const ratio = vi.spyOn(FakeRenderer.prototype, 'getPixelRatio').mockReturnValue(2);
    const { viewer, inner } = make();
    ratio.mockRestore();
    const { uRing, uRingColour } = inner.electrodeMaterial.uniforms;
    expect(uRing.value).toBe(2);
    expect(rounded(uRingColour.value.toArray())).toEqual(sRGB('#1a1a1a'));
    viewer.setDark(true);
    expect(uRingColour.value.toArray()).toEqual([1, 1, 1]);
  });

  it("turns a point of the view back into the circuit's frame, as deep in the view as a point given", () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    const contact: [number, number, number] = [95, 190, 300];
    const [x, y] = drawnAt(inner, contact);

    expect(rounded(viewer.fromScreen(x, y, contact))).toEqual(contact);
    const moved = viewer.fromScreen(x + 20, y - 10, contact);
    const [mx, my] = drawnAt(inner, moved);
    expect(mx).toBeCloseTo(x + 20);
    expect(my).toBeCloseTo(y - 10);
    const depth = (p: number[]) => centred(p).applyMatrix4(inner.camera.matrixWorldInverse).z;
    expect(depth(moved)).toBeCloseTo(depth(contact));
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
    expect(inner.uniforms.uGlow.value).toBeNull();
    expect(frames(inner)).toBe(1);
  });

  it('frees what it holds when it is disposed of', async () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    viewer.setElectrodes(arrays(), null);
    await viewer.pick(10, 10);
    const freed = [
      segmentsOf(inner).geometry,
      somasOf(inner).geometry,
      inner.uniforms.uCells.value as THREE.DataTexture,
      inner.uniforms.uGlow.value as THREE.DataTexture,
      inner.somaMaterial,
      inner.look.material,
      inner.idMaterials.segment,
      inner.idMaterials.soma,
      inner.idMaterials.cloud,
      inner.cloudMaterial,
      inner.idTarget as THREE.WebGLRenderTarget,
      (inner.electrodes as Quads).geometry,
      inner.electrodeMaterial,
    ].map((o) => vi.spyOn(o, 'dispose'));
    viewer.dispose();
    viewers = [];
    for (const dispose of freed) expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('frees the somas and the shade when it is disposed of', () => {
    const { viewer, inner } = make();
    viewer.setSomas(somas());
    const freed = [
      (inner.cloud?.mesh as Quads).geometry,
      inner.cloudUniforms.uShade.value as THREE.DataTexture,
    ].map((o) => vi.spyOn(o, 'dispose'));
    viewer.dispose();
    viewers = [];
    for (const dispose of freed) expect(dispose).toHaveBeenCalledTimes(1);
  });
});

describe("the circuit morphology viewer's spike replay", () => {
  /** Cell 0 fires at 10 ms and cell 2 at 50, in a recording of 100 ms; the rest are past any circuit. */
  const SPIKES = {
    cellIndices: Uint32Array.of(0, 2, 0xffffffff),
    times: Float32Array.of(10, 50, 60),
    timeMinInMs: 0,
    timeMaxInMs: 100,
  };
  const glow = (inner: Internals) => [
    ...((inner.uniforms.uGlow.value as THREE.DataTexture).image.data as Uint8Array).subarray(0, 3),
  ];
  /** A glow as the cell table keeps it. */
  const shaped = (glow: number) => Math.round(255 * glow ** 0.4);
  let now = 0;

  beforeAll(() => {
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });

  /** A turn of the loop, as long after the last as this. */
  function turnAfter(inner: Internals, ms: number): number {
    now += ms;
    return frames(inner);
  }

  it("glows each cell by its spikes at the replay's moment, from the cell table's glow beside its colours", () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    const glowTexture = inner.uniforms.uGlow.value as THREE.DataTexture;
    expect(glowTexture.format).toBe(THREE.RedFormat);
    expect(glowTexture.image.width).toBe(2048);
    viewer.setSpikes(SPIKES);
    expect(glow(inner)).toEqual([0, 0, 0]);

    frames(inner);
    viewer.seekSpikes(10);
    expect(glow(inner)).toEqual([255, 0, 0]);
    expect(frames(inner)).toBe(1);
    // A quarter of a second on screen, at the default 100 ms a second: down to 1/e of it 25 ms on.
    viewer.seekSpikes(50);
    expect(glow(inner)).toEqual([shaped(Math.exp(-40 / 25)), 0, 255]);

    viewer.setSpikeSpeed(200);
    expect(glow(inner)).toEqual([shaped(Math.exp(-40 / 50)), 0, 255]);
    viewer.setSpikeAfterglow(0.125);
    expect(glow(inner)).toEqual([shaped(Math.exp(-40 / 25)), 0, 255]);
    expect(frames(inner)).toBe(1);

    viewer.setSpikes(null);
    expect(glow(inner)).toEqual([0, 0, 0]);
    expect(frames(inner)).toBe(1);
    // No cell glows otherwise: no frame.
    viewer.setSpikeSpeed(100);
    expect(frames(inner)).toBe(0);
  });

  it('rings a glowing cell on a light background, in the somas view’s ring colour, and not on a dark one', () => {
    const { viewer, inner } = make();
    const rim = inner.uniforms.uGlowRim.value;
    expect(rim.w).toBe(1);
    expect(new THREE.Color(rim.x, rim.y, rim.z).getHexString()).toBe('4d4233');
    frames(inner);
    viewer.setDark(true);
    expect(rim.w).toBe(0);
    expect(frames(inner)).toBe(1);
    viewer.setDark(false);
    expect(rim.w).toBe(1);
  });

  it('lights the cells of data that comes after the spikes', () => {
    const { viewer, inner } = make();
    viewer.setSpikes(SPIKES);
    viewer.seekSpikes(50);
    viewer.setData(circuit());
    expect(glow(inner)[2]).toBe(255);
  });

  it('tells of the moment whenever it moves, but not where it stays', () => {
    const { viewer } = make();
    viewer.setData(circuit());
    const told = vi.fn();
    const stop = viewer.onSpikeTime(told);
    viewer.setSpikes(SPIKES);
    viewer.seekSpikes(30);
    viewer.seekSpikes(30);
    viewer.setSpikeSpeed(50);
    viewer.setSpikeAfterglow(1);
    expect(told.mock.calls).toEqual([[0], [30]]);

    stop();
    viewer.seekSpikes(40);
    expect(told).toHaveBeenCalledTimes(2);
  });

  it('moves on a frame at a time while it plays, and stops at the end of the spikes, which it tells of', () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    viewer.setSpikes(SPIKES);
    const times: number[] = [];
    const playing = vi.fn();
    viewer.onSpikeTime((time) => times.push(time));
    viewer.onSpikesPlaying(playing);
    frames(inner);
    frames(inner);
    expect(inner.renderer.loop).toBeNull();

    viewer.setSpikesPlaying(true);
    expect(playing.mock.calls).toEqual([[true]]);
    // 40 ms of the page is 4 ms of the replay: a frame to start the loop, then none while nothing glows.
    expect(turnAfter(inner, 40)).toBe(1);
    expect(times.at(-1)).toBeCloseTo(4);
    expect(turnAfter(inner, 40)).toBe(0);
    expect(times.at(-1)).toBeCloseTo(8);
    expect(inner.renderer.loop).not.toBeNull();
    expect(turnAfter(inner, 30)).toBe(1);
    expect(times.at(-1)).toBeCloseTo(11);
    expect(glow(inner)[0]).toBe(shaped(Math.exp(-1 / 25)));
    // A frame is worth a quarter of a second at the most: a page away for longer takes up where it was.
    turnAfter(inner, 10_000);
    expect(times.at(-1)).toBeCloseTo(36);

    for (let turn = 0; turn < 10 && times.at(-1) !== 100; turn++) turnAfter(inner, 250);
    expect(times.at(-1)).toBe(100);
    expect(playing.mock.calls).toEqual([[true], [false]]);
    turnAfter(inner, 16);
    expect(inner.renderer.loop).toBeNull();

    // Played again at the end, it starts from the beginning.
    viewer.setSpikesPlaying(true);
    expect(times.at(-1)).toBe(0);
  });

  it('stops playing for spikes handed over in the middle, and tells of it', () => {
    const { viewer } = make();
    viewer.setData(circuit());
    viewer.setSpikes(SPIKES);
    const playing = vi.fn();
    viewer.onSpikesPlaying(playing);
    viewer.setSpikesPlaying(true);
    viewer.setSpikesPlaying(true);
    viewer.setSpikes({ ...SPIKES });
    expect(playing.mock.calls).toEqual([[true], [false]]);
    viewer.setSpikes(SPIKES);
    expect(playing).toHaveBeenCalledTimes(2);
  });

  it('lets go of its listeners when it is disposed of', () => {
    const { viewer } = make();
    viewer.setData(circuit());
    viewer.setSpikes(SPIKES);
    const told = vi.fn();
    viewer.onSpikeTime(told);
    viewer.onSpikesPlaying(told);
    viewer.dispose();
    viewers = [];
    viewer.seekSpikes(20);
    viewer.setSpikesPlaying(true);
    expect(told).not.toHaveBeenCalled();
  });
});

/** Two cells of population A, 100 µm apart, and one of population B far from them. */
function somas(
  populations = [
    { name: 'A', cells: 2 },
    { name: 'B', cells: 1 },
  ]
): CircuitSomas {
  const all = [0, 0, 0, 100, 0, 0, 1000, 1000, 1000];
  const cells = populations.reduce((sum, population) => sum + population.cells, 0);
  return { positions: Float32Array.from(all.slice(0, 3 * cells)), populations };
}
const HIDE_B: CellColors = { palette: [null, false], columnByCell: Uint16Array.of(0, 0, 1) };

describe('the somas, before any morphology is in', () => {
  it("draws a quad a soma from the page's positions as they are, in a material of its own", () => {
    const { viewer, inner } = make();
    const given = somas();
    viewer.setSomas(given);
    const cloud = inner.cloud?.mesh as Quads;
    expect(cloud.parent).toBe(inner.surfaces);
    expect(cloud.material).toBe(inner.cloudMaterial);
    expect(cloud.frustumCulled).toBe(false);
    expect(cloud.geometry.instanceCount).toBe(3);
    const positions = cloud.geometry.getAttribute('aPosition') as THREE.InstancedBufferAttribute;
    expect(positions).toBeInstanceOf(THREE.InstancedBufferAttribute);
    expect(positions.array).toBe(given.positions);
    expect(inner.cloudUniforms.uShade.value).toBeInstanceOf(THREE.DataTexture);
    // The cell table's, which the somas share with the morphologies.
    expect(texel(inner, 0)).toEqual([...rgb(DEFAULT_NEURON_COLOR), 255]);
  });

  it('picks with the same quads in their numbers', () => {
    const { viewer, inner } = make();
    viewer.setSomas(somas());
    const [ids] = inner.ids.children as Quads[];
    expect(inner.ids.children).toHaveLength(1);
    expect(ids).toBe(inner.cloud?.ids);
    expect(ids.geometry).toBe(inner.cloud?.mesh.geometry);
    expect(ids.material).toBe(inner.idMaterials.cloud);
    expect(inner.renderer.compile).toHaveBeenCalledWith(inner.ids, inner.camera);
  });

  it('frames the somas, about the mean of them all, and takes it off every position', () => {
    const { viewer, inner } = make();
    const reset = vi.spyOn(viewer, 'resetView');
    viewer.setSomas(somas());
    expect(reset).toHaveBeenCalledTimes(1);
    expect(rounded(inner.centre)).toEqual([366.667, 333.333, 333.333]);
    expect(rounded(inner.cloudUniforms.uOffset.value.toArray())).toEqual(rounded(inner.centre));
    expect(frames(inner)).toBe(1);
  });

  it('keeps the view where populations are added or taken away, and frames it for others', () => {
    const { viewer, inner } = make();
    const reset = vi.spyOn(viewer, 'resetView');
    viewer.setSomas(somas([{ name: 'A', cells: 2 }]));
    const centre = inner.centre;
    viewer.setSomas(somas());
    viewer.setSomas(somas([{ name: 'B', cells: 1 }]));
    expect(reset).toHaveBeenCalledTimes(1);
    // Where the first somas were drawn about.
    expect(inner.centre).toBe(centre);
    expect(inner.cloudUniforms.uOffset.value.toArray()).toEqual(centre);

    viewer.setSomas(somas([{ name: 'C', cells: 1 }]));
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it("frames the somas drawn on a reset, about their mean, a soma's radius beyond the farthest of them", () => {
    const { viewer, inner } = make();
    viewer.setSomas(somas());
    viewer.setSomaRadius(10);
    viewer.setCellColors(HIDE_B);
    viewer.resetView();
    const middle = new THREE.Vector3(50, 0, 0).sub(new THREE.Vector3(...inner.centre));
    expect(rounded(inner.controls.target.toArray())).toEqual(rounded(middle.toArray()));
    const camera = inner.camera as THREE.OrthographicCamera;
    // 60 µm either side across a view 4/3 as wide as it is high, 92% of the way to its edge.
    expect(camera.top).toBeCloseTo(45 / 0.92);
    expect(rounded([camera.position.x, camera.position.y])).toEqual(rounded([middle.x, middle.y]));

    // None drawn, all of them.
    viewer.setCellColors({ palette: [false], columnByCell: Uint16Array.of(0, 0, 0) });
    viewer.resetView();
    expect(rounded(inner.controls.target.toArray())).toEqual([0, 0, 0]);
  });

  it('takes a radius without framing again, and bounds every soma as large as one glowing in full', () => {
    const { viewer, inner } = make();
    viewer.setSomas(somas());
    const reset = vi.spyOn(viewer, 'resetView');
    frames(inner);
    viewer.setSomaRadius(10);
    expect(reset).not.toHaveBeenCalled();
    expect(inner.cloudUniforms.uRadius.value).toBe(10);
    expect(frames(inner)).toBe(1);
    // 633.3 µm from the mean to the far soma on x, either way, and 17 µm.
    expect(inner.bounds.max.x).toBeCloseTo(633.333 + 17, 2);
    expect(inner.bounds.min.x).toBeCloseTo(-633.333 - 17, 2);
    viewer.setSomaRadius(10);
    expect(frames(inner)).toBe(0);
  });

  it('blends translucent somas, writing their depth still, and keeps one at no opacity drawn', () => {
    const { viewer, inner } = make();
    viewer.setSomas(somas());
    const material = inner.cloudMaterial;
    expect([material.transparent, material.depthWrite]).toEqual([false, true]);
    const version = material.version;
    viewer.setSomaOpacity(0.2);
    expect(inner.cloudUniforms.uOpacity.value).toBe(0.2);
    expect([material.transparent, material.depthWrite]).toEqual([true, true]);
    expect(material.version).toBe(version + 1);
    viewer.setSomaOpacity(0);
    expect(inner.cloudUniforms.uOpacity.value).toBe(1 / 255);
    expect(material.version).toBe(version + 1);
    viewer.setSomaOpacity(1);
    expect([inner.cloudUniforms.uOpacity.value, material.transparent]).toEqual([1, false]);
  });

  it('takes how crowded each soma is, for these somas only', () => {
    const { viewer, inner } = make();
    const given = somas();
    viewer.setSomas(given);
    // Every other byte: how crowded each cell is.
    const shade = () => {
      const bytes = (inner.cloudUniforms.uShade.value as THREE.DataTexture).image
        .data as Uint8Array;
      return [bytes[0], bytes[2], bytes[4]];
    };
    expect(shade()).toEqual([128, 128, 128]);
    frames(inner);
    viewer.setCrowding(given, Uint8Array.of(255, 200, 0));
    expect(shade()).toEqual([255, 200, 0]);
    expect(frames(inner)).toBe(1);
    // Other somas of as many cells.
    viewer.setCrowding(somas(), Uint8Array.of(1, 2, 3));
    expect(shade()).toEqual([255, 200, 0]);
    // Other somas begin half crowded again.
    viewer.setSomas(somas());
    expect(shade()).toEqual([128, 128, 128]);
  });

  it('keeps the somas over morphologies of other cells, and has them back after morphologies alone', () => {
    const { viewer, inner } = make();
    const reset = vi.spyOn(viewer, 'resetView');
    viewer.setSomas(somas([{ name: 'A', cells: 2 }]));
    const { cloud } = inner;
    viewer.setData(circuit());
    expect(inner.cloud).toBe(cloud);
    expect(cloud?.mesh.visible).toBe(true);
    expect(inner.chunks.children).toHaveLength(0);
    viewer.setData(null);
    expect(cloud?.mesh.visible).toBe(true);

    viewer.setSomas(null);
    viewer.setData(circuit());
    expect(inner.chunks.children).toHaveLength(1);
    viewer.setSomas(somas());
    expect(inner.chunks.children).toHaveLength(0);
    expect(inner.ids.children).toHaveLength(1);
    expect(reset).toHaveBeenCalledTimes(3);
  });

  it('paints the somas once in the colours they come with, and not again for the same colours', () => {
    const { viewer, inner } = make();
    viewer.setSomas(somas(), HIDE_B);
    const version = (inner.uniforms.uCells.value as THREE.DataTexture).version;
    expect(texel(inner, 2)[3]).toBe(0);
    viewer.setCellColors(HIDE_B);
    expect((inner.uniforms.uCells.value as THREE.DataTexture).version).toBe(version);
  });

  it('glows a soma as it fires, cells numbered as the positions are', () => {
    const { viewer, inner } = make();
    viewer.setSomas(somas());
    viewer.setSpikes({
      cellIndices: Uint32Array.of(2),
      times: Float32Array.of(50),
      timeMinInMs: 0,
      timeMaxInMs: 100,
    });
    viewer.seekSpikes(50);
    const glow = (inner.uniforms.uGlow.value as THREE.DataTexture).image.data as Uint8Array;
    expect([...glow.subarray(0, 3)]).toEqual([0, 0, 255]);
  });
});

/** `circuit()`'s morphologies, of the cells `somas()` places. */
const ofTheSomas = (): CircuitMorphologyData => ({
  ...circuit(),
  populations: somas().populations,
});

describe('the morphologies over the somas', () => {
  it("draw in the somas' place, where the circuit's frame puts them, with the same cells and view", () => {
    const { viewer, inner } = make();
    const reset = vi.spyOn(viewer, 'resetView');
    viewer.setSomas(somas());
    const { cloud, cloudUniforms } = inner;
    const table = inner.uniforms.uCells.value;
    viewer.setCellColors(HIDE_B);
    frames(inner);
    viewer.setData(ofTheSomas());

    expect(reset).toHaveBeenCalledTimes(1);
    expect(inner.cloud).toBe(cloud);
    expect(cloud?.mesh.visible).toBe(false);
    expect(inner.ids.children.map((mesh) => mesh.visible)).toEqual([false, true, true]);
    expect(inner.uniforms.uCells.value).toBe(table);
    expect(texel(inner, 2)[3]).toBe(0);
    // The data's centre, (100, 200, 300), from the somas' mean.
    const shift = new THREE.Vector3(100, 200, 300).sub(cloudUniforms.uOffset.value);
    expect(rounded(inner.uniforms.uShift.value.toArray())).toEqual(rounded(shift.toArray()));
    const drawn = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(15, 30, 5));
    expect(inner.bounds.containsBox(drawn.translate(shift))).toBe(true);
    expect(frames(inner)).toBe(1);
  });

  it('give the somas their place back when they go, and let go of their own geometries alone', () => {
    const { viewer, inner } = make();
    viewer.setSomas(somas());
    const table = inner.uniforms.uCells.value;
    viewer.setData(ofTheSomas());
    const freed = [segmentsOf(inner).geometry, somasOf(inner).geometry].map((o) =>
      vi.spyOn(o, 'dispose')
    );
    frames(inner);
    viewer.setData(null);
    for (const dispose of freed) expect(dispose).toHaveBeenCalledTimes(1);
    expect(inner.cloud?.mesh.visible).toBe(true);
    expect(inner.ids.children.map((mesh) => mesh.visible)).toEqual([true]);
    expect(inner.chunks.children).toHaveLength(0);
    expect(inner.uniforms.uCells.value).toBe(table);
    expect(inner.uniforms.uShift.value.toArray()).toEqual([0, 0, 0]);
    expect(frames(inner)).toBe(1);
  });

  it('frame the view again where they are of other populations', () => {
    const { viewer } = make();
    const reset = vi.spyOn(viewer, 'resetView');
    viewer.setSomas(somas());
    viewer.setData({
      ...circuit(),
      populations: [
        { name: 'A', cells: 2 },
        { name: 'C', cells: 1 },
      ],
    });
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it('are framed about their own middle on a reset', () => {
    const { viewer, inner } = make();
    viewer.setSomas(somas());
    viewer.setData(ofTheSomas());
    viewer.resetView();
    const middle = new THREE.Vector3(5, 12.5, 0).add(inner.uniforms.uShift.value);
    expect(rounded(inner.controls.target.toArray())).toEqual(rounded(middle.toArray()));
  });

  it('frame the cells drawn on a reset, and none hidden', () => {
    const { viewer, inner } = make();
    viewer.setSomas(somas());
    viewer.setData(ofTheSomas());
    viewer.setCellColors(HIDE_B);
    viewer.resetView();
    // Cell 0 alone: its segment, (0, 0, 0) to (10, 0, 0) and 1 µm round, and its soma, 5 µm round the origin.
    const middle = new THREE.Vector3(3, 0, 0).add(inner.uniforms.uShift.value);
    expect(rounded(inner.controls.target.toArray())).toEqual(rounded(middle.toArray()));
  });

  it('are gone with the somas when other somas come', () => {
    const { viewer, inner } = make();
    viewer.setSomas(somas());
    viewer.setData(ofTheSomas());
    viewer.setSomas(somas());
    expect(inner.chunks.children).toHaveLength(0);
    expect(inner.cloud?.mesh.visible).toBe(true);
    expect(inner.ids.children).toHaveLength(1);
  });
});

describe("the circuit viewer's zoom", () => {
  it('is the orthographic camera’s, 1 as a reset frames it, and is told to the pixel scale’s listeners', () => {
    const { viewer, inner } = make();
    viewer.setSomas(somas());
    const scale = viewer.currentPixelScale as number;
    const heard = vi.fn();
    viewer.onPixelScaleChange(heard);
    frames(inner);
    viewer.setZoom(4);
    expect(viewer.zoom).toBe(4);
    expect((inner.camera as THREE.OrthographicCamera).zoom).toBe(4);
    expect(heard).toHaveBeenCalledExactlyOnceWith(scale / 4);
    expect(frames(inner)).toBe(1);
    viewer.setZoom(4);
    expect(heard).toHaveBeenCalledTimes(1);
    viewer.resetView();
    expect(viewer.zoom).toBe(1);
  });
});
