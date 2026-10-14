import chroma from 'chroma-js';
import * as THREE from 'three';

import { SpikeClock } from '@/features/circuit-viewer/spike-clock';
import { CANVAS_DARK, CANVAS_LIGHT } from '@/features/scan-config/components/color-by/contrast';
import { DEFAULT_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';
import { SceneViewer } from '@/features/viewer-3d/engine/scene-viewer';

import { CellTable } from './cell-table';
import {
  countContacts,
  drawnRadius,
  electrodeMaterial,
  minRadius,
  writeElectrodes,
} from './electrodes';
import { cellNearMiddle, idMaterial, impostor, impostorUniforms, NO_CELL } from './impostors';
import {
  GLOW_SWELL,
  somaCloudIdMaterial,
  somaCloudMaterial,
  somaCloudUniforms,
} from './soma-cloud';

import type { CircuitSpikes } from '@/features/circuit-viewer/types';
import type { ThemeColors } from '@/features/viewer-3d/engine/looks';
import type {
  CellColors,
  CircuitMorphologyData,
  CircuitMorphologyView,
  CircuitSomas,
  ElectrodeGroup,
  ElectrodeHit,
  Population,
  Vec3,
} from '../types';

/** A quad's corners, x, y, z after one another, and its two triangles, which face the eye. */
const CORNERS = [-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0];
const TRIANGLES = [0, 1, 2, 2, 1, 3];

/**
 * What the highlighted cell and the ring round each contact are drawn in: as far from the background as no colour of a
 * palette is.
 */
const FOREGROUND: ThemeColors = { light: '#1a1a1a', dark: '#ffffff' };

/** How far around the pixel asked for a pick looks, in CSS pixels, as the somas view does. */
const PICK_REACH = 4;
/**
 * How far from a contact's centre a point is still on it, in CSS pixels, however small it is drawn: the somas view's 14
 * device pixels on a screen of pixel ratio 2.
 */
const CONTACT_REACH = 7;
const point = new THREE.Vector3();

/** `instances` quads, for the caller to add the attributes a shader places each by. */
function quadGeometry(instances: number): THREE.InstancedBufferGeometry {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(CORNERS, 3));
  geometry.setIndex(TRIANGLES);
  geometry.instanceCount = instances;
  return geometry;
}

function quads(
  geometry: THREE.InstancedBufferGeometry,
  material: THREE.Material
): THREE.Mesh<THREE.InstancedBufferGeometry> {
  const mesh = new THREE.Mesh(geometry, material);
  // The geometry's own four corners say nothing of where the quads are.
  mesh.frustumCulled = false;
  mesh.visible = geometry.instanceCount > 0;
  return mesh;
}

/** The somas that have a position, four floats each, and the cell of each. */
function placedSomas(somas: Float32Array): { spheres: Float32Array; cells: Uint32Array } {
  const spheres = new Float32Array(somas.length);
  const cells = new Uint32Array(somas.length / 4);
  let placed = 0;
  for (let cell = 0; cell < cells.length; cell++) {
    if (Number.isNaN(somas[4 * cell])) continue;
    for (let k = 0; k < 4; k++) spheres[4 * placed + k] = somas[4 * cell + k];
    cells[placed++] = cell;
  }
  return { spheres: spheres.subarray(0, 4 * placed), cells: cells.subarray(0, placed) };
}

/** Whether neither set of populations takes in the other's: another circuit, or another population in place of one. */
function framesAgain(before: Population[] | null, after: Population[]): boolean {
  if (!before) return true;
  const has = (all: Population[], some: Population[]) =>
    some.every(({ name }) => all.some((population) => population.name === name));
  return !has(before, after) && !has(after, before);
}

/**
 * The somas of `positions` that `drawn` keeps, as the somas view framed them: their mean, and the farthest of them from
 * it on each axis; null where it keeps none that has a place.
 */
function somasBox(
  positions: Float32Array,
  drawn: (cell: number) => boolean
): { mean: Vec3; reach: Vec3 } | null {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const sum = [0, 0, 0];
  let count = 0;
  for (let cell = 0; 3 * cell + 2 < positions.length; cell++) {
    const i = 3 * cell;
    if (!drawn(cell) || !Number.isFinite(positions[i] + positions[i + 1] + positions[i + 2])) {
      continue;
    }
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], positions[i + k]);
      max[k] = Math.max(max[k], positions[i + k]);
      sum[k] += positions[i + k];
    }
    count++;
  }
  if (count === 0) return null;
  const mean = sum.map((s) => s / count) as Vec3;
  return { mean, reach: mean.map((m, k) => Math.max(max[k] - m, m - min[k])) as Vec3 };
}

/**
 * A circuit's morphologies on the shared scene, in the Studio look: a quad a segment and a quad a soma (`impostors.ts`),
 * each cell coloured and shown or not by its texel of the cell table, and electrode contacts in front of them
 * (`electrodes.ts`). Before a circuit's morphologies are in, or without them, its somas are drawn as the somas view
 * drew them (`soma-cloud.ts`), from the page's positions. A spike replay lights the cells as they fire, on a clock
 * (`SpikeClock`) moved on by each turn of the loop.
 *
 * Frames go straight to the antialiased canvas, with no ambient occlusion: a flat quad has a flat depth. The arrays
 * are drawn from as the reader made them, and kept: after a lost context three uploads them again.
 */
export class CircuitMorphologyViewer extends SceneViewer implements CircuitMorphologyView {
  private uniforms = impostorUniforms();
  private somaMaterial: THREE.Material;
  private segments: THREE.Mesh | null = null;
  private somas: THREE.Mesh | null = null;
  private cloudUniforms = somaCloudUniforms();
  private cloudMaterial = somaCloudMaterial(this.uniforms, this.cloudUniforms);
  private cloud: THREE.Mesh | null = null;
  /** The somas the cloud draws, whose populations decide whether the next ones are framed. */
  private somaSet: CircuitSomas | null = null;
  /** The same quads in their cells' numbers, drawn for a pick alone. */
  private ids = new THREE.Scene();
  private idMaterials = {
    segment: idMaterial('segment', this.uniforms),
    soma: idMaterial('soma', this.uniforms),
    cloud: somaCloudIdMaterial(this.uniforms, this.cloudUniforms),
  };
  private idTarget: THREE.WebGLRenderTarget | null = null;
  private table: CellTable | null = null;
  private colors: CellColors | null = null;
  private defaultColor = DEFAULT_NEURON_COLOR;
  private background = CANVAS_LIGHT;
  /** What the data's positions have taken off: the electrodes come in the circuit's own frame. */
  private centre: Vec3 = [0, 0, 0];
  private electrodeGroups: readonly ElectrodeGroup[] = [];
  private highlightedElectrode: string | null = null;
  private electrodeUniforms = {
    uViewport: this.uniforms.uViewport,
    uRadius: { value: 0 },
    uMinRadius: { value: minRadius(0) },
    uRingColour: { value: new THREE.Vector3() },
  };
  private electrodeMaterial = electrodeMaterial(
    this.electrodeUniforms,
    this.renderer.getPixelRatio()
  );
  private electrodes: THREE.Mesh<THREE.InstancedBufferGeometry> | null = null;
  private spiking = new SpikeClock();
  private spikeTimeListeners = new Set<(timeInMs: number) => void>();
  private spikesPlayingListeners = new Set<(playing: boolean) => void>();

  constructor(container: HTMLElement) {
    super(container, {
      surface: ['color'],
      looks: ['studio'],
      powerPreference: 'high-performance',
    });
    this.chunks.name = 'circuit morphologies';
    const look = this.look;
    // The look's own material draws the segments, as every mesh under `chunks`; the somas have a copy of it.
    this.somaMaterial = impostor(look.material.clone(), 'soma', this.uniforms);
    impostor(look.material, 'segment', this.uniforms);
    // The circuit viewer's own background, as behind the somas, in place of Studio's gradient.
    look.background = { light: [CANVAS_LIGHT, CANVAS_LIGHT], dark: [CANVAS_DARK, CANVAS_DARK] };
    look.onTheme = (dark) => {
      const theme = dark ? 'dark' : 'light';
      this.background = look.background[theme][0];
      this.uniforms.uHighlight.value.set(FOREGROUND[theme]);
      this.uniforms.uGlowRim.value.w = dark ? 0 : 1;
      this.electrodeUniforms.uRingColour.value.fromArray(chroma(FOREGROUND[theme]).gl());
    };
    this.setDark(false);
  }

  protected override disposeContent(): void {
    this.clear();
    this.somaMaterial.dispose();
    this.cloudMaterial.dispose();
    for (const material of Object.values(this.idMaterials)) material.dispose();
    this.idTarget?.dispose();
    this.electrodes?.geometry.dispose();
    this.electrodeMaterial.dispose();
    this.spikeTimeListeners.clear();
    this.spikesPlayingListeners.clear();
  }

  snapshot(): HTMLCanvasElement | null {
    const frame = this.renderer.domElement;
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = this.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    // The canvas holds a frame only in the task that drew it, so it is drawn again here and copied at once.
    this.renderer.render(this.scene, this.camera);
    context.drawImage(frame, 0, 0);
    return canvas;
  }

  setData(data: CircuitMorphologyData | null): void {
    this.clear();
    if (!data) return;
    this.makeTable(data.somas.length / 4);

    const segments = quadGeometry(data.segmentCells.length);
    const ends = new THREE.InstancedInterleavedBuffer(data.segments, 8);
    segments
      .setAttribute('aA', new THREE.InterleavedBufferAttribute(ends, 4, 0))
      .setAttribute('aB', new THREE.InterleavedBufferAttribute(ends, 4, 4))
      .setAttribute('aCell', new THREE.InstancedBufferAttribute(data.segmentCells, 1));
    this.segments = quads(segments, this.look.material);
    this.chunks.add(this.segments);

    const { spheres, cells } = placedSomas(data.somas);
    const somas = quadGeometry(cells.length);
    somas
      .setAttribute('aSoma', new THREE.InstancedBufferAttribute(spheres, 4))
      .setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 1));
    this.somas = quads(somas, this.somaMaterial);
    // Beside `chunks`, whose meshes all take the look's material.
    this.surfaces.add(this.somas);

    this.ids.add(quads(segments, this.idMaterials.segment), quads(somas, this.idMaterials.soma));
    this.compileIds();

    this.bounds.set(new THREE.Vector3(...data.bounds.min), new THREE.Vector3(...data.bounds.max));
    this.centre = data.centre;
    this.drawElectrodes();
    this.resetView();
  }

  setSomas(somas: CircuitSomas | null): void {
    const before = this.somaSet?.populations ?? null;
    this.clear();
    if (!somas) return;
    this.somaSet = somas;
    const cells = Math.floor(somas.positions.length / 3);
    this.makeTable(cells);
    const geometry = quadGeometry(cells);
    geometry.setAttribute('aPosition', new THREE.InstancedBufferAttribute(somas.positions, 3));
    this.cloud = quads(geometry, this.cloudMaterial);
    this.cloud.name = 'somas';
    this.surfaces.add(this.cloud);
    this.ids.add(quads(geometry, this.idMaterials.cloud));
    this.compileIds();

    const reframe = framesAgain(before, somas.populations);
    // Kept otherwise, so that the somas stay where they were drawn.
    if (reframe) this.centre = somasBox(somas.positions, () => true)?.mean ?? [0, 0, 0];
    this.cloudUniforms.uOffset.value.fromArray(this.centre);
    this.boundSomas();
    this.drawElectrodes();
    if (reframe) this.resetView();
  }

  setSomaRadius(radius: number): void {
    if (radius === this.cloudUniforms.uRadius.value) return;
    this.cloudUniforms.uRadius.value = radius;
    this.boundSomas();
    if (this.cloud?.visible) this.invalidate();
  }

  setSomaOpacity(opacity: number): void {
    const clamped = Number.isNaN(opacity) ? 1 : Math.min(1, Math.max(0, opacity));
    // At 0 a soma is still drawn, so that it can be picked and seen to spike.
    this.cloudUniforms.uOpacity.value = Math.max(clamped, 1 / 255);
    const translucent = clamped < 1;
    if (translucent !== this.cloudMaterial.transparent) {
      this.cloudMaterial.transparent = translucent;
      this.cloudMaterial.needsUpdate = true;
    }
    if (this.cloud?.visible) this.invalidate();
  }

  setCrowding(crowding: Uint8Array | null): void {
    // Worked out for other somas.
    if (!this.table || (crowding && crowding.length !== this.table.cells)) return;
    this.table.setCrowding(crowding);
    if (this.cloud?.visible) this.invalidate();
  }

  /**
   * Over the somas, the view frames those drawn as the somas view did: centred on their mean, as far either side as the
   * farthest of them from it on each axis, and a soma's radius more. Where none is drawn, all of them.
   */
  override resetView(): void {
    const { somaSet, table, cloud } = this;
    if (!somaSet || !table || !cloud?.visible) {
      super.resetView();
      return;
    }
    const box =
      somasBox(somaSet.positions, (cell) => table.shown(cell)) ??
      somasBox(somaSet.positions, () => true);
    if (!box) {
      super.resetView();
      return;
    }
    const reach = box.reach.map((r) => r + this.cloudUniforms.uRadius.value);
    const points: number[] = [];
    for (const x of [-reach[0], reach[0]]) {
      for (const y of [-reach[1], reach[1]])
        for (const z of [-reach[2], reach[2]]) points.push(x, y, z);
    }
    this.fitPoints = Float32Array.from(points);
    super.resetView();
    this.fitPoints = null;
    // Framed around the origin, and moved onto the somas' mean.
    const middle = new THREE.Vector3(...box.mean).sub(new THREE.Vector3(...this.centre));
    this.camera.position.add(middle);
    this.controls.target.copy(middle);
    this.controls.update();
  }

  setCellColors(colors: CellColors | null): void {
    this.colors = colors;
    this.paint();
  }

  setDefaultColor(color: string): void {
    if (color === this.defaultColor) return;
    this.defaultColor = color;
    this.paint();
  }

  get moving(): boolean {
    return this.drawnMoving;
  }

  setHighlight(cell: number | null): void {
    const highlighted = cell ?? NO_CELL;
    if (highlighted === this.uniforms.uHighlighted.value) return;
    this.uniforms.uHighlighted.value = highlighted;
    this.invalidate();
  }

  pick(x: number, y: number): Promise<number | null> {
    const table = this.table;
    if (!table) return Promise.resolve(null);
    const { renderer } = this;
    const ratio = renderer.getPixelRatio();
    const target = this.pickTarget();
    const side = target.width;
    const middle = (side - 1) / 2;
    // The whole view, placed so that the pixel asked for is the target's middle one. A frame buffer's rows count up.
    const { width, height } = renderer.domElement;
    target.viewport.set(
      middle - Math.floor(x * ratio),
      middle - (height - 1 - Math.floor(y * ratio)),
      width,
      height
    );
    // No frame may have been drawn since the camera last moved.
    this.camera.updateMatrixWorld();
    renderer.setRenderTarget(target);
    renderer.render(this.ids, this.camera);
    renderer.setRenderTarget(null);
    const pixels = new Uint8Array(4 * side * side);
    return renderer.readRenderTargetPixelsAsync(target, 0, 0, side, side, pixels).then(
      // Other data by now has other cells.
      () => (this.table === table ? cellNearMiddle(pixels, side) : null),
      () => null
    );
  }

  setElectrodes(electrodes: readonly ElectrodeGroup[], highlighted: string | null): void {
    this.electrodeGroups = electrodes;
    this.highlightedElectrode = highlighted;
    this.drawElectrodes();
  }

  setElectrodeRadius(radius: number): void {
    this.electrodeUniforms.uRadius.value = radius;
    this.electrodeUniforms.uMinRadius.value = minRadius(radius);
    if (this.electrodes?.visible) this.invalidate();
  }

  electrodeAt(x: number, y: number): ElectrodeHit | null {
    const { camera, centre, width, height } = this;
    camera.updateMatrixWorld();
    const perspective = camera instanceof THREE.PerspectiveCamera;
    // The µm a CSS pixel spans, at a unit's depth in perspective, as the shaders count it.
    const span = 2 / (camera.projectionMatrix.elements[5] * height);
    const radius = this.electrodeUniforms.uRadius.value;
    const pixelRatio = this.renderer.getPixelRatio();
    let found: ElectrodeHit | null = null;
    let nearest = Number.POSITIVE_INFINITY;
    for (const group of this.electrodeGroups) {
      const lit = group.id === this.highlightedElectrode;
      const xyz = group.coordinates;
      for (let i = 0; i + 2 < xyz.length; i += 3) {
        point.set(xyz[i] - centre[0], xyz[i + 1] - centre[1], xyz[i + 2] - centre[2]);
        point.applyMatrix4(camera.matrixWorldInverse);
        const depth = -point.z;
        if (perspective && depth <= camera.near) continue;
        const drawn = drawnRadius(radius, lit, perspective ? span * depth : span, pixelRatio);
        const reach = Math.max(drawn, CONTACT_REACH);
        point.applyMatrix4(camera.projectionMatrix);
        const away = Math.hypot(((point.x + 1) / 2) * width - x, ((1 - point.y) / 2) * height - y);
        if (away <= reach && away < nearest) {
          nearest = away;
          found = { id: group.id, contact: [xyz[i], xyz[i + 1], xyz[i + 2]] };
        }
      }
    }
    return found;
  }

  fromScreen(x: number, y: number, depthOf: Vec3): Vec3 {
    const { camera, centre, width, height } = this;
    camera.updateMatrixWorld();
    const depth = point
      .set(depthOf[0] - centre[0], depthOf[1] - centre[1], depthOf[2] - centre[2])
      .project(camera).z;
    point.set((2 * x) / width - 1, 1 - (2 * y) / height, depth).unproject(camera);
    return [point.x + centre[0], point.y + centre[1], point.z + centre[2]];
  }

  setSpikes(spikes: CircuitSpikes | null): void {
    const wasPlaying = this.spiking.playing;
    this.spiking.setSpikes(spikes, this.table?.cells ?? 0);
    this.spikeFrame();
    if (wasPlaying) this.tellPlaying(false);
  }

  seekSpikes(timeInMs: number): void {
    if (timeInMs === this.spiking.timeInMs) return;
    this.spiking.timeInMs = timeInMs;
    this.spikeFrame();
  }

  setSpikesPlaying(playing: boolean): void {
    if (playing === this.spiking.playing) return;
    // Played at the end, the clock starts again from the beginning.
    this.spiking.playing = playing;
    this.spikeFrame();
    // The loop turns for `work` once it is going.
    if (playing) this.invalidate();
    this.tellPlaying(playing);
  }

  setSpikeSpeed(speed: number): void {
    if (speed === this.spiking.speed) return;
    this.spiking.speed = speed;
    this.showGlow();
  }

  setSpikeAfterglow(seconds: number): void {
    if (seconds === this.spiking.afterglowInSeconds) return;
    this.spiking.afterglowInSeconds = seconds;
    this.showGlow();
  }

  onSpikeTime(listener: (timeInMs: number) => void): () => void {
    this.spikeTimeListeners.add(listener);
    return () => this.spikeTimeListeners.delete(listener);
  }

  onSpikesPlaying(listener: (playing: boolean) => void): () => void {
    this.spikesPlayingListeners.add(listener);
    return () => this.spikesPlayingListeners.delete(listener);
  }

  /** The replay's clock moves on by the time the last turn of the loop took, which keeps turning while it plays. */
  protected override work(): boolean {
    if (!this.spiking.playing) return false;
    const ended = this.spiking.advance();
    this.spikeFrame();
    if (ended) this.tellPlaying(false);
    return !ended;
  }

  /** A frame only where a cell glows otherwise: before the first spike, a playing replay draws nothing. */
  private showGlow(): void {
    if (this.table?.glow(this.spiking.glow)) this.invalidate();
  }

  /** The glow at the replay's moment, which the listeners are told of. */
  private spikeFrame(): void {
    this.showGlow();
    const { timeInMs } = this.spiking;
    for (const listener of this.spikeTimeListeners) listener(timeInMs);
  }

  private tellPlaying(playing: boolean): void {
    for (const listener of this.spikesPlayingListeners) listener(playing);
  }

  /**
   * The contacts as they are now, in a mesh drawn after the cells, over them, made larger only when they outgrow it. A
   * frame only where that changed what is drawn.
   */
  private drawElectrodes(): void {
    const count = countContacts(this.electrodeGroups);
    let mesh = this.electrodes;
    if (count === 0 && !mesh?.visible) return;
    const changed = !mesh || count !== mesh.geometry.instanceCount;
    if (!mesh || count > mesh.geometry.getAttribute('aContact').count) {
      mesh?.geometry.dispose();
      mesh?.removeFromParent();
      const geometry = quadGeometry(count);
      geometry
        .setAttribute(
          'aContact',
          new THREE.InstancedBufferAttribute(new Float32Array(3 * count), 3)
        )
        .setAttribute('aLook', new THREE.InstancedBufferAttribute(new Float32Array(4 * count), 4));
      mesh = quads(geometry, this.electrodeMaterial);
      mesh.name = 'electrodes';
      mesh.renderOrder = 1;
      this.scene.add(mesh);
      this.electrodes = mesh;
    }
    mesh.geometry.instanceCount = count;
    mesh.visible = count > 0;
    const contacts = mesh.geometry.getAttribute('aContact') as THREE.InstancedBufferAttribute;
    const looks = mesh.geometry.getAttribute('aLook') as THREE.InstancedBufferAttribute;
    const written = writeElectrodes(
      this.electrodeGroups,
      this.highlightedElectrode,
      this.centre,
      contacts.array as Float32Array,
      looks.array as Float32Array
    );
    if (written) {
      contacts.needsUpdate = true;
      looks.needsUpdate = true;
    }
    if (written || changed) this.invalidate();
  }

  /** A cell table for `cells` cells, which the shaders read, painted, and glowing as the replay is. */
  private makeTable(cells: number): void {
    this.table = new CellTable(cells);
    this.uniforms.uCells.value = this.table.texture;
    this.uniforms.uGlow.value = this.table.glowTexture;
    this.cloudUniforms.uShade.value = this.table.shadeTexture;
    this.paint();
    this.spiking.setCellCount(cells);
    this.showGlow();
  }

  /**
   * The pick's programs begin to build now, not at the first pick, which would wait for them. Built for the pick's
   * target: three builds a program for the colour space and tone mapping of where it draws.
   */
  private compileIds(): void {
    const { renderer } = this;
    renderer.setRenderTarget(this.pickTarget());
    renderer.compile(this.ids, this.camera);
    renderer.setRenderTarget(null);
  }

  /** `bounds` round every soma of the cloud, drawn or not, and as large as one glowing in full. */
  private boundSomas(): void {
    const box = this.somaSet && somasBox(this.somaSet.positions, () => true);
    if (!box) return;
    const pad = this.cloudUniforms.uRadius.value * (1 + GLOW_SWELL);
    const centre = new THREE.Vector3(...box.mean).sub(new THREE.Vector3(...this.centre));
    const reach = new THREE.Vector3(...box.reach).addScalar(pad);
    this.bounds.set(centre.clone().sub(reach), centre.add(reach));
  }

  private pickTarget(): THREE.WebGLRenderTarget {
    const side = 2 * Math.ceil(PICK_REACH * this.renderer.getPixelRatio()) + 1;
    this.idTarget ??= new THREE.WebGLRenderTarget(side, side);
    return this.idTarget;
  }

  private paint(): void {
    if (!this.table) return;
    this.table.paint(this.colors, this.defaultColor);
    this.invalidate();
  }

  private clear(): void {
    for (const mesh of [this.segments, this.somas, this.cloud]) {
      mesh?.geometry.dispose();
      mesh?.removeFromParent();
    }
    this.segments = this.somas = this.cloud = null;
    this.somaSet = null;
    this.ids.clear();
    this.table?.dispose();
    this.table = null;
    this.uniforms.uCells.value = null;
    this.uniforms.uGlow.value = null;
    this.cloudUniforms.uShade.value = null;
    this.uniforms.uHighlighted.value = NO_CELL;
    this.invalidate();
  }
}
