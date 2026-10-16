// @vitest-environment jsdom
import chroma from 'chroma-js';
import * as THREE from 'three';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { CircuitMorphologyViewer } from '@/features/circuit-viewer/morphologies/engine/circuit-morphology-viewer';
import { CELL_MASK, NO_CELL } from '@/features/circuit-viewer/morphologies/engine/impostors';
import { placeTrees } from '@/features/circuit-viewer/morphologies/load/place-trees';
import { treeOf } from '@/features/circuit-viewer/morphologies/load/tree';
import { pointAtOffset } from '@/features/circuit-viewer/morphologies/sections';
import { SectionType } from '@/features/circuit-viewer/section-type';
import { DEFAULT_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';

import type { ImpostorUniforms } from '@/features/circuit-viewer/morphologies/engine/impostors';
import type { SomaCloudUniforms } from '@/features/circuit-viewer/morphologies/engine/soma-cloud';
import type {
  BoxRead,
  CellColors,
  CircuitMorphologyData,
  CircuitSomas,
  ElectrodeGroup,
} from '@/features/circuit-viewer/morphologies/types';
import type { Sections } from '@/features/scan-config/types';
import type { Look } from '@/features/viewer-3d/engine/looks';

const { FakeRenderer } = vi.hoisted(() => {
  /** Draws nothing; it keeps what it was made with and counts the frames asked of it. */
  class FakeRenderer {
    /** The pixel ratio the next renderer is made with. */
    static devicePixelRatio = 1;
    domElement = document.createElement('canvas');
    loop: (() => void) | null = null;
    pixelRatio = FakeRenderer.devicePixelRatio;
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
  chunks: THREE.Group;
  surfaces: THREE.Group;
  bounds: THREE.Box3;
  look: Look;
  uniforms: ImpostorUniforms;
  materials: {
    segment: THREE.Material[];
    soma: THREE.Material;
    cloud: THREE.ShaderMaterial;
    ids: {
      segment: THREE.ShaderMaterial[];
      soma: THREE.ShaderMaterial;
      cloud: THREE.ShaderMaterial;
    };
    electrode: THREE.ShaderMaterial;
  };
  cloud: { mesh: Quads; ids: Quads } | null;
  cloudUniforms: SomaCloudUniforms;
  ids: THREE.Scene;
  idTarget: THREE.WebGLRenderTarget | null;
  controls: { target: THREE.Vector3 };
  centre: [number, number, number];
  camera: THREE.Camera;
  scene: THREE.Scene;
  electrodes: Quads | null;
  spots: THREE.Scene;
  spotUniforms: { uSegments: { value: number } };
  markerUniforms: { uRadius: { value: number } };
  markerDots: Quads | null;
}

type Quads = THREE.Mesh<THREE.InstancedBufferGeometry>;

let viewers: CircuitMorphologyViewer[] = [];

/** A viewer on a screen of `pixelRatio`. */
function make(pixelRatio = 1): {
  viewer: CircuitMorphologyViewer;
  inner: Internals;
  host: HTMLElement;
} {
  const host = document.body.appendChild(document.createElement('div'));
  Object.defineProperties(host, { clientWidth: { value: 400 }, clientHeight: { value: 300 } });
  FakeRenderer.devicePixelRatio = pixelRatio;
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
    (o) => o instanceof THREE.Mesh && o.material === inner.materials.soma
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

const SECTIONS = {
  soma: '#aaaaaa',
  axon: '#3399ff',
  apicalDendrite: '#bb22ff',
  basalDendrite: '#ff5555',
  unknown: '#ff8800',
};

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
  });

  it('draws in the Studio look', () => {
    const { inner } = make();
    expect(inner.look.id).toBe('studio');
  });

  it("has the circuit viewer's flat background of the theme in place of Studio's gradient", () => {
    const { viewer, host } = make();
    const white = 'linear-gradient(rgb(255, 255, 255), rgb(255, 255, 255))';
    const black = 'linear-gradient(rgb(0, 0, 0), rgb(0, 0, 0))';
    expect(host.style.background).toBe(white);
    viewer.setDark(true);
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
    // Each segment's cell, and its type in the top byte.
    expect(Array.from(cell.array)).toEqual([0 + 3 * 2 ** 24, 2 + 2 * 2 ** 24]);
    expect(geometry.getAttribute('aType')).toBeUndefined();
    // Kept once uploaded, for three to upload again after a lost context.
    const words = cell.array;
    a.data.onUploadCallback();
    cell.onUploadCallback();
    expect(a.data.array).toBe(data.segments);
    expect(cell.array).toBe(words);
  });

  it("draws a quad a soma that has a position, in a copy of the look's material", () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    const somas = somasOf(inner);
    expect(somas.material).toBe(inner.materials.soma);
    expect(somas.material).not.toBe(inner.look.material);
    expect(inner.materials.soma.customProgramCacheKey()).toContain('impostor-soma');
    expect(somas.geometry.instanceCount).toBe(2);
    expect([...somas.geometry.getAttribute('aSoma').array]).toEqual([0, 0, 0, 5, 10, 20, 0, 4]);
    expect([...somas.geometry.getAttribute('aCell').array]).toEqual([0, 2]);
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

  it('hands the shaders the section colours a cell is painted in, a step short of opaque', () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    viewer.setCellColors({
      palette: [{ ...SECTIONS, soma: '#ff0000' }],
      columnByCell: Uint16Array.of(0, 0, 0),
    });
    expect(texel(inner, 0)).toEqual([255, 0, 0, 254]);
    const [unknown, soma, axon] = inner.uniforms.uSectionColours.value;
    expect([unknown, soma, axon].map((colour) => `#${colour.getHexString()}`)).toEqual([
      SECTIONS.unknown,
      '#ff0000',
      SECTIONS.axon,
    ]);
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
    expect(inner.materials.ids.segment).toEqual([segments.material]);
    expect(somas.geometry).toBe(somasOf(inner).geometry);
    expect(somas.material).toBe(inner.materials.ids.soma);
    for (const quads of [segments, somas]) expect(quads.frustumCulled).toBe(false);
    expect(inner.materials.ids.soma.uniforms.uCells).toBe(inner.uniforms.uCells);
    // Built with the data, ahead of the first pick, for the target a pick draws into.
    expect(inner.renderer.compile).toHaveBeenCalledExactlyOnceWith(inner.ids, inner.camera);
    expect(steps).toEqual(['into 9x9', 'build', 'back to the canvas']);

    viewer.setData(null);
    expect(inner.ids.children).toHaveLength(0);
  });

  it('picks the cell drawn at a point from the device pixels within 4 CSS pixels of it, drawn in numbers for it', async () => {
    const { viewer, inner } = make(2);
    const { renderer } = inner;
    renderer.domElement.width = 800;
    renderer.domElement.height = 600;
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
    expect(mesh.material).toBe(inner.materials.electrode);
    expect(inner.materials.electrode.depthTest).toBe(false);
    expect(inner.materials.electrode.depthWrite).toBe(false);
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

  it('draws synapses after the cells and among them, behind what is nearer, centred as the data is', () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    const groups = [
      { color: '#ff0000', coordinates: Float32Array.of(110, 220, 300, 100, 200, 300) },
      { color: '#0000ff', coordinates: [95, 190, 300] },
    ];
    frames(inner);
    viewer.setSynapses(groups);
    expect(frames(inner)).toBe(1);

    const mesh = inner.scene.getObjectByName('synapses') as Quads;
    expect(mesh.renderOrder).toBe(0.5);
    const material = mesh.material as THREE.ShaderMaterial;
    expect([material.depthTest, material.depthWrite]).toEqual([true, false]);
    // No ring, and brought towards the eye by its radius, to sit on its surface.
    expect([material.uniforms.uRing.value, material.uniforms.uLift.value]).toEqual([0, 1]);
    expect([material.uniforms.uRadius.value, material.uniforms.uMinRadius.value]).toEqual([0.5, 2]);
    expect(mesh.geometry.instanceCount).toBe(3);
    expect(rounded(mesh.geometry.getAttribute('aContact').array)).toEqual([
      10, 20, 0, 0, 0, 0, -5, -10, 0,
    ]);
    expect(rounded(mesh.geometry.getAttribute('aLook').array)).toEqual([
      ...[1, 0, 0, 1],
      ...[1, 0, 0, 1],
      ...[0, 0, 1, 1],
    ]);

    viewer.setSynapses(groups);
    expect(frames(inner)).toBe(0);
    viewer.setSynapses([]);
    expect(mesh.visible).toBe(false);
    expect(inner.materials.electrode.uniforms.uLift.value).toBe(0);
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
    const { uRadius, uMinRadius, uViewport } = inner.materials.electrode.uniforms;
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
    const { viewer, inner } = make(2);
    const { uRing, uRingColour } = inner.materials.electrode.uniforms;
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

  it("draws no morphologies of more cells than a segment's word has room for, saying so", () => {
    const { viewer, inner } = make();
    const said = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Only the count is read of the somas, before anything is drawn.
    const somas = { length: 4 * (CELL_MASK + 2) } as unknown as Float32Array;
    viewer.setData({ ...circuit(), somas });
    expect(said).toHaveBeenCalledTimes(1);
    said.mockRestore();
    expect(inner.chunks.children).toHaveLength(0);
    expect(inner.uniforms.uCells.value).toBeNull();
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
      inner.materials.soma,
      inner.look.material,
      ...inner.materials.ids.segment,
      inner.materials.ids.soma,
      inner.materials.ids.cloud,
      inner.materials.cloud,
      inner.idTarget as THREE.WebGLRenderTarget,
      (inner.electrodes as Quads).geometry,
      inner.materials.electrode,
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
    expect(cloud.material).toBe(inner.materials.cloud);
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
    expect(ids.material).toBe(inner.materials.ids.cloud);
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
    const material = inner.materials.cloud;
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

  it('are framed as they come in, told to follow, while the view is as the last framing left it', () => {
    const { viewer, inner } = make();
    const reset = vi.spyOn(viewer, 'resetView');
    viewer.setSomas(somas());
    viewer.setData(ofTheSomas(), true);
    expect(reset).toHaveBeenCalledTimes(2);
    const middle = new THREE.Vector3(5, 12.5, 0).add(inner.uniforms.uShift.value);
    expect(rounded(inner.controls.target.toArray())).toEqual(rounded(middle.toArray()));
    // OrbitControls' arithmetic moves nothing.
    inner.camera.position.x *= 1 + 1e-9;
    viewer.setData(ofTheSomas(), true);
    expect(reset).toHaveBeenCalledTimes(3);
    viewer.setData(ofTheSomas());
    expect(reset).toHaveBeenCalledTimes(3);
  });

  it('keep a view that was moved, till a reset frames it again', () => {
    const { viewer, inner } = make();
    const reset = vi.spyOn(viewer, 'resetView');
    viewer.setSomas(somas());
    for (const move of [
      () => inner.camera.position.add(new THREE.Vector3(0, 0, 50)),
      () => inner.controls.target.add(new THREE.Vector3(5, 0, 0)),
      () => inner.camera.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.3),
      () => viewer.setZoom(2),
    ]) {
      viewer.resetView();
      move();
      reset.mockClear();
      viewer.setData(ofTheSomas(), true);
      expect(reset).not.toHaveBeenCalled();
    }
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

describe('the morphologies read a box at a time', () => {
  /** The reads asked for, each waiting for the test to end it. */
  let reads: { wanted: BoxRead[]; resolve(): void }[] = [];
  /** A box's segments at each level, the finest first: cell 0's at the first box, cell 2's at the second. */
  const COUNTS = [40, 20, 4];

  /** `circuit()`'s somas and frame, its segments in two boxes either side of its middle. */
  function chunked(): CircuitMorphologyData {
    const none = { segments: new Float32Array(0), segmentCells: new Uint32Array(0) };
    return {
      ...circuit(),
      ...none,
      segmentTypes: new Uint8Array(0),
      chunks: {
        boxes: Float32Array.of(-5, -5, -5, 5, 5, 5, 5, 5, -5, 15, 30, 5),
        levels: [0.125, 0.25, 1].map((toleranceUm, level) => ({
          toleranceUm,
          pruneUm: 0,
          segments: Uint32Array.of(COUNTS[level], COUNTS[level]),
        })),
        read: (wanted) =>
          new Promise((resolve) => {
            reads.push({
              wanted,
              resolve: () =>
                resolve(
                  wanted.map(({ level, box }) => ({
                    segments: new Float32Array(8 * COUNTS[level]).fill(1),
                    segmentCells: new Uint32Array(COUNTS[level]).fill(2 * box),
                    segmentTypes: new Uint8Array(COUNTS[level]).fill(3),
                  }))
                ),
            });
          }),
      },
    };
  }

  /** The reads asked for so far ended, and what they read placed. */
  async function readAll(inner: Internals) {
    for (const read of reads.splice(0)) read.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    frames(inner);
  }

  beforeEach(() => {
    reads = [];
  });

  it('reads the boxes in view as the first frame wants them, and draws them in one mesh as they come', async () => {
    const { viewer, inner } = make();
    viewer.setData(chunked());
    const segments = segmentsOf(inner);
    expect(segments.visible).toBe(true);
    expect(segments.geometry.instanceCount).toBe(0);
    expect(reads).toHaveLength(0);

    frames(inner);
    expect(reads).toHaveLength(1);
    const { wanted } = reads[0];
    expect(wanted.map(({ box }) => box).sort()).toEqual([0, 1]);
    await readAll(inner);

    expect(segmentsOf(inner)).toBe(segments);
    expect(segments.geometry.instanceCount).toBe(
      wanted.reduce((sum, { level }) => sum + COUNTS[level], 0)
    );
    const words = segments.geometry.getAttribute('aCell').array;
    const cells = Array.from(
      words.subarray(0, segments.geometry.instanceCount),
      (w) => w & 0xffffff
    );
    expect(new Set(cells)).toEqual(new Set([0, 2]));
  });

  it('picks with the same quads', async () => {
    const { viewer, inner } = make();
    viewer.setData(chunked());
    frames(inner);
    await readAll(inner);

    const picked = inner.ids.children.find(
      (mesh) => mesh instanceof THREE.Mesh && mesh.geometry === segmentsOf(inner).geometry
    );
    expect(picked?.visible).toBe(true);
  });

  it('tells what it draws, the rules included, and null once the morphologies go', async () => {
    const { viewer, inner } = make();
    const told = vi.fn();
    viewer.onDetail(told);
    expect(told).toHaveBeenLastCalledWith(null);
    viewer.setData(chunked());
    frames(inner);
    await readAll(inner);

    const detail = told.mock.lastCall?.[0];
    expect(detail).toMatchObject({ budget: 2_000_000, pixels: 2, leftOut: 0 });
    expect(detail.drawn).toBe(segmentsOf(inner).geometry.instanceCount);
    expect(
      detail.levels
        .map(({ boxes }: { boxes: number }) => boxes)
        .reduce((a: number, b: number) => a + b)
    ).toBe(2);
    viewer.setData(null);
    expect(told).toHaveBeenLastCalledWith(null);
  });

  it('holds the budget it is told, and leaves out the box farthest from the focus', async () => {
    const { viewer, inner } = make();
    const told = vi.fn();
    viewer.onDetail(told);
    viewer.setData(chunked());
    viewer.setDetailRules({ budget: COUNTS[2] });
    frames(inner);
    await readAll(inner);

    expect(told.mock.lastCall?.[0]).toMatchObject({
      budget: COUNTS[2],
      drawn: COUNTS[2],
      leftOut: 1,
    });
    expect(segmentsOf(inner).geometry.instanceCount).toBe(COUNTS[2]);
  });

  it('places nothing of a read that ends after the morphologies are gone', async () => {
    const { viewer, inner } = make();
    viewer.setData(chunked());
    frames(inner);
    const segments = segmentsOf(inner);
    viewer.setData(null);
    await readAll(inner);

    expect(segments.geometry.instanceCount).toBe(0);
  });
});

describe("the circuit viewer's nudge", () => {
  let now = 0;
  beforeEach(() => {
    now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });
  afterEach(() => vi.mocked(performance.now).mockRestore());
  const turnAt = (inner: Internals, ms: number) => {
    now = 1000 + ms;
    return frames(inner);
  };

  it('zooms in by a sine’s hump of 6% over 0.9 s, and ends where it began, a frame a turn', () => {
    const { viewer, inner } = make();
    viewer.setSomas(somas());
    frames(inner);
    viewer.setZoom(2);
    viewer.nudge();
    viewer.nudge();
    expect(turnAt(inner, 450)).toBe(1);
    expect(viewer.zoom).toBeCloseTo(2 * 1.06, 6);
    expect(turnAt(inner, 225)).toBe(1);
    expect(viewer.zoom).toBeCloseTo(2 * (1 + 0.06 * Math.SQRT1_2), 6);
    turnAt(inner, 900);
    expect(viewer.zoom).toBe(2);
    expect(turnAt(inner, 1000)).toBe(0);
  });

  it('ends at once where the user zooms or takes the view', () => {
    const { viewer, inner } = make();
    viewer.setSomas(somas());
    viewer.nudge();
    turnAt(inner, 100);
    viewer.setZoom(3);
    turnAt(inner, 200);
    expect(viewer.zoom).toBe(3);

    viewer.nudge();
    turnAt(inner, 300);
    const zoom = viewer.zoom;
    (inner.controls as unknown as THREE.EventDispatcher<{ start: object }>).dispatchEvent({
      type: 'start',
    });
    turnAt(inner, 400);
    expect(viewer.zoom).toBe(zoom);
  });
});

describe("the circuit viewer's dendrogram", () => {
  let now = 0;
  beforeEach(() => {
    now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });
  afterEach(() => vi.mocked(performance.now).mockRestore());
  const turnAt = (inner: Internals, ms: number) => {
    now = 1000 + ms;
    return frames(inner);
  };
  /** That neuron, its dendrogram charted, beside a cell drawn as its soma. */
  const charted = () =>
    placeTrees(
      {
        somas: {
          positions: Float32Array.of(0, 50, 0, 100, 0, 0),
          populations: [{ name: 'A', cells: 2 }],
        },
        orientations: null,
      },
      [null, treeOf(NEURON, { axons: true, chart: true })],
      [0, 0, 0]
    );
  const mixOf = (inner: Internals) => inner.uniforms.uMix.value;

  it('draws the dendrogram beside the morphology, and the morphology itself again where none was charted', () => {
    const { viewer, inner } = make();
    const data = charted();
    viewer.setData(data);
    const { geometry } = segmentsOf(inner);
    const chartA = geometry.getAttribute('aChartA') as THREE.InterleavedBufferAttribute;
    expect(chartA.data.array).toBe(data.chart?.segments);
    expect([
      chartA.offset,
      (geometry.getAttribute('aChartB') as THREE.InterleavedBufferAttribute).offset,
    ]).toEqual([0, 4]);
    expect(Array.from(somasOf(inner).geometry.getAttribute('aSomaChart').array)).toEqual(
      Array.from(data.chart?.somas ?? [])
    );

    viewer.setData(neuron());
    const plain = segmentsOf(inner).geometry;
    expect((plain.getAttribute('aChartA') as THREE.InterleavedBufferAttribute).data).toBe(
      (plain.getAttribute('aA') as THREE.InterleavedBufferAttribute).data
    );
  });

  it('morphs into it over 0.6 s, eased in and out, framed facing the eye and turned no more, and back', () => {
    const { viewer, inner } = make();
    viewer.setData(charted());
    const reset = vi.spyOn(viewer, 'resetView');
    const controls = inner.controls as unknown as { enableRotate: boolean };
    viewer.setDendrogram(true);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(controls.enableRotate).toBe(false);
    turnAt(inner, 150);
    expect(mixOf(inner)).toBeCloseTo(4 * 0.25 ** 3, 6);
    turnAt(inner, 300);
    expect(mixOf(inner)).toBeCloseTo(0.5, 6);
    turnAt(inner, 600);
    expect(mixOf(inner)).toBe(1);
    expect(turnAt(inner, 700)).toBe(0);

    viewer.setDendrogram(false);
    expect(controls.enableRotate).toBe(true);
    expect(reset).toHaveBeenCalledTimes(1);
    turnAt(inner, 1000);
    expect(mixOf(inner)).toBeCloseTo(0.5, 6);
    turnAt(inner, 1300);
    expect(mixOf(inner)).toBe(0);
  });

  it('takes the markers along, on the same share of the same segment', () => {
    const { viewer, inner } = make();
    const data = charted();
    viewer.setData(data);
    viewer.setLocationMarkers([{ cell: 1, sonataId: 1, offset: 0.5, color: '#ff0000' }]);
    const contact = () =>
      rounded((inner.markerDots as Quads).geometry.getAttribute('aContact').array);
    expect(contact()).toEqual([110.3, 0.4, 10]);
    viewer.setDendrogram(true);
    turnAt(inner, 600);
    const section = data.trees?.morphologies[1]?.sections[1];
    if (!section) throw new Error('no section 1');
    expect(contact()).toEqual(rounded(pointAtOffset(data, 1, section, 0.5, 1) ?? []));
    expect(contact()).not.toEqual([110.3, 0.4, 10]);
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

/** A soma at (0, 0, 10), a basal dendrite out of it 9 µm long in two segments, and a child of it 10 µm long. */
const NEURON: Sections = [
  {
    id: 'soma',
    sonata_section_id: 0,
    parent_id: null,
    type: SectionType.Soma,
    points: [[0, 0, 10]],
    radii: [6],
  },
  {
    id: '0',
    sonata_section_id: 1,
    parent_id: 'soma',
    type: SectionType.BasalDendrite,
    points: [
      [6, 0, 10],
      [10, 0, 10],
      [13, 4, 10],
    ],
    radii: [2, 1.5, 1],
  },
  {
    id: '1',
    sonata_section_id: 2,
    parent_id: '0',
    type: SectionType.BasalDendrite,
    points: [
      [13, 4, 10],
      [13, 14, 10],
    ],
    radii: [0.8, 0.5],
  },
];

/** A cell with no morphology, then that neuron, unturned, 100 µm along x, around the origin. */
const neuron = () =>
  placeTrees(
    {
      somas: {
        positions: Float32Array.of(0, 50, 0, 100, 0, 0),
        populations: [{ name: 'A', cells: 2 }],
      },
      orientations: null,
    },
    [null, treeOf(NEURON, { axons: true })],
    [0, 0, 0]
  );

/** Where the view draws a point of its frame, in CSS pixels. */
function onScreen(inner: Internals, at: [number, number, number]): [number, number] {
  inner.camera.updateMatrixWorld();
  const p = new THREE.Vector3(...at).project(inner.camera);
  return [((p.x + 1) / 2) * 400, ((1 - p.y) / 2) * 300];
}

/** The pick's pixels with `n` drawn in the middle one of 9 by 9, as the pass draws numbers: n and one. */
function drawn(inner: Internals, n: number) {
  inner.renderer.readRenderTargetPixelsAsync.mockImplementation(
    async (_target, _x, _y, _w, _h, pixels: Uint8Array) => {
      new DataView(pixels.buffer).setUint32(4 * (4 * 9 + 4), n + 1, true);
      return pixels;
    }
  );
}

describe('the pick of a section', () => {
  it('finds the section and the offset under a point, from the segments drawn in their numbers', async () => {
    const { viewer, inner } = make();
    viewer.setData(neuron());
    expect(inner.spots.children).toHaveLength(2);
    expect(inner.spotUniforms.uSegments.value).toBe(4);
    const scenes: THREE.Scene[] = [];
    inner.renderer.render.mockImplementation((scene: THREE.Scene) => scenes.push(scene));
    drawn(inner, 2);
    // 0.4 of the way along the dendrite's second segment, 6 µm into its 9.
    const [x, y] = onScreen(inner, [111.2, 1.6, 10]);
    const spot = await viewer.pickSection(x, y);
    expect(scenes).toEqual([inner.spots]);
    expect(spot).toEqual({
      cell: 1,
      sonataId: 1,
      type: SectionType.BasalDendrite,
      offset: expect.closeTo(6 / 9, 3),
      screen: { x: expect.closeTo(x / 400, 3), y: expect.closeTo(y / 300, 3) },
    });
  });

  it("finds the soma's section halfway along, on the soma, which the pass numbers after the segments", async () => {
    const { viewer, inner } = make();
    viewer.setData(neuron());
    drawn(inner, 4 + 1);
    const [x, y] = onScreen(inner, [100, 0, 10]);
    await expect(viewer.pickSection(x + 3, y)).resolves.toEqual({
      cell: 1,
      sonataId: 0,
      type: SectionType.Soma,
      offset: 0.5,
      screen: { x: expect.closeTo(x / 400, 3), y: expect.closeTo(y / 300, 3) },
    });
  });

  it('finds none on a cell drawn as its soma alone, nor where nothing is drawn', async () => {
    const { viewer, inner } = make();
    viewer.setData(neuron());
    drawn(inner, 4 + 0);
    await expect(viewer.pickSection(10, 10)).resolves.toBeNull();
    drawn(inner, -1);
    await expect(viewer.pickSection(10, 10)).resolves.toBeNull();
  });

  it('tells the cell from the same read, a soma alone too, where the morphologies were read whole', async () => {
    const { viewer, inner } = make();
    viewer.setData(neuron());
    const scenes: THREE.Scene[] = [];
    inner.renderer.render.mockImplementation((scene: THREE.Scene) => scenes.push(scene));
    drawn(inner, 2);
    const [x, y] = onScreen(inner, [111.2, 1.6, 10]);
    const [cell, spot] = await Promise.all([viewer.pick(x, y), viewer.pickSection(x, y)]);
    expect([cell, spot?.cell]).toEqual([1, 1]);
    expect(scenes).toEqual([inner.spots]);
    expect(inner.renderer.readRenderTargetPixelsAsync).toHaveBeenCalledTimes(1);
    // Asked again, it reads again: the view may have moved since.
    drawn(inner, 4 + 0);
    await expect(viewer.pick(x, y)).resolves.toBe(0);
    expect(inner.renderer.readRenderTargetPixelsAsync).toHaveBeenCalledTimes(2);
  });

  it('finds none, drawing nothing, of morphologies not read whole', async () => {
    const { viewer, inner } = make();
    viewer.setData(circuit());
    expect(inner.spots.children).toHaveLength(0);
    inner.renderer.render.mockClear();
    await expect(viewer.pickSection(10, 10)).resolves.toBeNull();
    expect(inner.renderer.render).not.toHaveBeenCalled();
  });
});

describe('the markers of morphology locations', () => {
  const MARKER = { cell: 1, sonataId: 1, offset: 6 / 9, color: '#ff0000' };

  it('mark a location where its section puts it, after the electrodes and over them, and are found there', () => {
    const { viewer, inner } = make();
    viewer.setData(neuron());
    viewer.setLocationMarkers([MARKER, { ...MARKER, sonataId: 9 }, { ...MARKER, cell: 0 }]);
    const dots = inner.markerDots as Quads;
    expect(dots.renderOrder).toBe(2);
    expect((dots.material as THREE.ShaderMaterial).depthTest).toBe(false);
    expect(dots.geometry.instanceCount).toBe(1);
    expect(rounded(dots.geometry.getAttribute('aContact').array.slice(0, 3))).toEqual([
      111.2, 1.6, 10,
    ]);
    expect(rounded(dots.geometry.getAttribute('aLook').array.slice(0, 4))).toEqual([1, 0, 0, 1]);

    const [x, y] = onScreen(inner, [111.2, 1.6, 10]);
    expect(viewer.markerAt(x + 6, y)).toEqual({
      index: 0,
      type: SectionType.BasalDendrite,
      screen: { x: expect.closeTo(x / 400, 3), y: expect.closeTo(y / 300, 3) },
      visible: true,
    });
    expect(viewer.markerAt(x + 10, y)).toBeNull();
  });

  it("wait for their cell's morphology, and tell where they are after every frame", () => {
    const { viewer, inner } = make();
    const heard = vi.fn();
    viewer.onMarkersOnScreen(heard);
    viewer.setLocationMarkers([MARKER]);
    expect(frames(inner)).toBe(1);
    expect(heard).toHaveBeenLastCalledWith([null]);

    viewer.setData(neuron());
    frames(inner);
    const [x, y] = onScreen(inner, [111.2, 1.6, 10]);
    expect(heard).toHaveBeenLastCalledWith([
      {
        type: SectionType.BasalDendrite,
        screen: { x: expect.closeTo(x / 400, 3), y: expect.closeTo(y / 300, 3) },
        visible: true,
      },
    ]);
    viewer.setData(null);
    expect(inner.markerDots?.visible).toBe(false);
  });

  it('tell where they are only where that changed, of none once till there are some', () => {
    const { viewer, inner } = make();
    const heard = vi.fn();
    viewer.onMarkersOnScreen(heard);
    frames(inner);
    expect(heard).toHaveBeenCalledExactlyOnceWith([]);
    viewer.setData(neuron());
    frames(inner);
    expect(heard).toHaveBeenCalledTimes(1);
    viewer.setLocationMarkers([MARKER]);
    frames(inner);
    expect(heard).toHaveBeenCalledTimes(2);
    // A frame that moved nothing.
    viewer.setHighlight(0);
    expect(frames(inner)).toBe(1);
    expect(heard).toHaveBeenCalledTimes(2);
    viewer.setLocationMarkers([]);
    frames(inner);
    expect(heard).toHaveBeenLastCalledWith([]);
    viewer.setZoom(2);
    frames(inner);
    expect(heard).toHaveBeenCalledTimes(3);
  });

  it('are as large as told, a frame drawn only where one is on show', () => {
    const { viewer, inner } = make();
    frames(inner);
    viewer.setLocationMarkerRadius(5);
    expect(inner.markerUniforms.uRadius.value).toBe(5);
    expect(frames(inner)).toBe(0);
    viewer.setData(neuron());
    viewer.setLocationMarkers([MARKER]);
    frames(inner);
    viewer.setLocationMarkerRadius(4);
    expect(frames(inner)).toBe(1);
  });
});
