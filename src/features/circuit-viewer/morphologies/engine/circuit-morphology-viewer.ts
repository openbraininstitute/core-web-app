import chroma from 'chroma-js';
import * as THREE from 'three';

import { SpikeClock } from '@/features/circuit-viewer/spike-clock';
import { CANVAS_DARK, CANVAS_LIGHT } from '@/features/scan-config/components/color-by/contrast';
import { DEFAULT_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';
import { boxCorners } from '@/features/viewer-3d/engine/framing';
import { SceneViewer } from '@/features/viewer-3d/engine/scene-viewer';

import { extentOf } from '../extent';
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

type Quads = THREE.Mesh<THREE.InstancedBufferGeometry>;

function quads(geometry: THREE.InstancedBufferGeometry, material: THREE.Material): Quads {
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

/** Where somas lie, as the somas view framed them: their mean, and the farthest of them from it on each axis. */
interface SomasBox {
  mean: Vec3;
  reach: Vec3;
}

/** The box of the somas of `positions` that `keep` keeps; null where it keeps none that has a place. */
function somasBox(positions: Float32Array, keep?: (cell: number) => boolean): SomasBox | null {
  const extent = extentOf(positions, keep);
  if (!extent) return null;
  const { min, max, mean } = extent;
  return { mean, reach: mean.map((m, k) => Math.max(max[k] - m, m - min[k])) as Vec3 };
}

/**
 * A circuit's morphologies on the shared scene, in the Studio look: a quad a segment and a quad a soma (`impostors.ts`),
 * each cell coloured and shown or not by its texel of the cell table, and electrode contacts in front of them
 * (`electrodes.ts`). Before a circuit's morphologies are in, or without them, its somas are drawn as the somas view
 * drew them (`soma-cloud.ts`), from the page's positions; its morphologies then take their place, over the same cells,
 * in the same view. A spike replay lights the cells as they fire, on a clock (`SpikeClock`) moved on by each turn of
 * the loop.
 *
 * Frames go straight to the antialiased canvas, with no ambient occlusion: a flat quad has a flat depth. The arrays
 * are drawn from as the reader made them, and kept: after a lost context three uploads them again.
 */
export class CircuitMorphologyViewer extends SceneViewer implements CircuitMorphologyView {
  private uniforms = impostorUniforms();
  private somaMaterial: THREE.Material;
  /** The morphologies, their segments' and their somas' quads, and the same quads for the pick. */
  private layer: { data: CircuitMorphologyData; meshes: Quads[]; ids: Quads[] } | null = null;
  private cloudUniforms = somaCloudUniforms();
  private cloudMaterial = somaCloudMaterial(this.uniforms, this.cloudUniforms);
  /**
   * The somas the cloud draws, whose populations decide whether the next ones are framed, the box round all of them,
   * and their quads, and the same quads for the pick.
   */
  private cloud: { somas: CircuitSomas; box: SomasBox | null; mesh: Quads; ids: Quads } | null =
    null;
  /** The quads of the cloud and the morphologies in their cells' numbers, drawn for a pick alone. */
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
  private electrodes: Quads | null = null;
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

  /**
   * Over the somas of the same cells, the morphologies take their place, drawn where the circuit's frame puts them and
   * framed only as the somas would be (`setSomas`); null gives the somas their place back. Without them, the
   * morphologies are all there is, about their own centre.
   */
  setData(data: CircuitMorphologyData | null): void {
    this.clearMorphologies();
    // The somas of the same cells, which keep the cell table, the origin and the view.
    const under = data && this.table?.cells === data.somas.length / 4 ? this.cloud : null;
    if (data && !under) {
      this.clear();
      this.makeTable(data.somas.length / 4);
    }
    this.showCloud(data === null);
    if (!data) {
      // Without the somas, the morphologies were all there was.
      if (this.cloud) this.bound();
      else this.clear();
      return;
    }

    const segments = quadGeometry(data.segmentCells.length);
    const ends = new THREE.InstancedInterleavedBuffer(data.segments, 8);
    segments
      .setAttribute('aA', new THREE.InterleavedBufferAttribute(ends, 4, 0))
      .setAttribute('aB', new THREE.InterleavedBufferAttribute(ends, 4, 4))
      .setAttribute('aCell', new THREE.InstancedBufferAttribute(data.segmentCells, 1));
    const segmentMesh = quads(segments, this.look.material);
    this.chunks.add(segmentMesh);

    const { spheres, cells } = placedSomas(data.somas);
    const somas = quadGeometry(cells.length);
    somas
      .setAttribute('aSoma', new THREE.InstancedBufferAttribute(spheres, 4))
      .setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 1));
    const somaMesh = quads(somas, this.somaMaterial);
    // Beside `chunks`, whose meshes all take the look's material.
    this.surfaces.add(somaMesh);

    const ids = [quads(segments, this.idMaterials.segment), quads(somas, this.idMaterials.soma)];
    this.ids.add(...ids);
    this.layer = { data, meshes: [segmentMesh, somaMesh], ids };
    this.compileIds();

    if (under) {
      this.uniforms.uShift.value.fromArray(data.centre).sub(new THREE.Vector3(...this.centre));
    } else {
      this.centre = data.centre;
      this.drawElectrodes();
    }
    this.bound();
    if (framesAgain(under?.somas.populations ?? null, data.populations)) this.resetView();
  }

  setSomas(somas: CircuitSomas | null): void {
    const before = this.cloud?.somas.populations ?? null;
    this.clear();
    if (!somas) return;
    const cells = Math.floor(somas.positions.length / 3);
    this.makeTable(cells);
    const geometry = quadGeometry(cells);
    geometry.setAttribute('aPosition', new THREE.InstancedBufferAttribute(somas.positions, 3));
    const mesh = quads(geometry, this.cloudMaterial);
    mesh.name = 'somas';
    this.surfaces.add(mesh);
    const ids = quads(geometry, this.idMaterials.cloud);
    this.ids.add(ids);
    const box = somasBox(somas.positions);
    this.cloud = { somas, box, mesh, ids };
    this.compileIds();

    const reframe = framesAgain(before, somas.populations);
    // Kept otherwise, so that the somas stay where they were drawn.
    if (reframe) this.centre = box?.mean ?? [0, 0, 0];
    this.cloudUniforms.uOffset.value.fromArray(this.centre);
    this.bound();
    this.drawElectrodes();
    if (reframe) this.resetView();
  }

  setSomaRadius(radius: number): void {
    if (radius === this.cloudUniforms.uRadius.value) return;
    this.cloudUniforms.uRadius.value = radius;
    this.bound();
    if (this.cloud?.mesh.visible) this.invalidate();
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
    if (this.cloud?.mesh.visible) this.invalidate();
  }

  setCrowding(crowding: Uint8Array | null): void {
    // Worked out for other somas.
    if (!this.table || (crowding && crowding.length !== this.table.cells)) return;
    this.table.setCrowding(crowding);
    if (this.cloud?.mesh.visible) this.invalidate();
  }

  /**
   * Over the somas, the view frames those drawn as the somas view did: centred on their mean, as far either side as the
   * farthest of them from it on each axis, and a soma's radius more; where none is drawn, all of them. Over their
   * morphologies, it frames the morphologies' bounds about their middle.
   */
  override resetView(): void {
    const { cloud, table, layer } = this;
    if (!cloud || !table) {
      super.resetView();
      return;
    }
    if (layer) {
      this.frameBox(this.shifted(layer.data.bounds));
      return;
    }
    const shown = table.hides ? somasBox(cloud.somas.positions, (cell) => table.shown(cell)) : null;
    const drawn = shown ?? cloud.box;
    if (!drawn) {
      super.resetView();
      return;
    }
    this.frameBox(this.somaBox(drawn, this.cloudUniforms.uRadius.value));
  }

  /** The view framed on `box`, about its middle, as `resetView` frames anything about the origin. */
  private frameBox(box: THREE.Box3): void {
    const middle = box.getCenter(new THREE.Vector3());
    this.fitPoints = Float32Array.from(boxCorners(box, middle));
    super.resetView();
    this.fitPoints = null;
    this.camera.position.add(middle);
    this.controls.target.copy(middle);
    this.controls.update();
  }

  /** The somas of `box`, `pad` more each way, where the view draws them. */
  private somaBox({ mean, reach }: SomasBox, pad: number): THREE.Box3 {
    const middle = new THREE.Vector3(...mean).sub(new THREE.Vector3(...this.centre));
    const half = new THREE.Vector3(...reach).addScalar(pad);
    return new THREE.Box3(middle.clone().sub(half), middle.add(half));
  }

  /** A box of the morphologies' frame, where the view draws it. */
  private shifted(bounds: CircuitMorphologyData['bounds']): THREE.Box3 {
    const shift = this.uniforms.uShift.value;
    return new THREE.Box3(
      new THREE.Vector3(...bounds.min).add(shift),
      new THREE.Vector3(...bounds.max).add(shift)
    );
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
    this.spiking.setSpikes(spikes);
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
    if (this.table?.glow(this.spiking.glow, this.spiking.lit)) this.invalidate();
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

  /**
   * `bounds` round what there is: every soma of the cloud, drawn or not and as large as one glowing in full, and the
   * morphologies.
   */
  private bound(): void {
    const all = new THREE.Box3();
    const box = this.cloud?.box;
    if (box) all.copy(this.somaBox(box, this.cloudUniforms.uRadius.value * (1 + GLOW_SWELL)));
    if (this.layer) all.union(this.shifted(this.layer.data.bounds));
    if (!all.isEmpty()) this.bounds.copy(all);
  }

  /** The cloud and its pick shown, or not while the morphologies take their place. */
  private showCloud(shown: boolean): void {
    if (this.cloud) {
      for (const mesh of [this.cloud.mesh, this.cloud.ids]) {
        mesh.visible = shown && mesh.geometry.instanceCount > 0;
      }
    }
    this.invalidate();
  }

  /** Let go of the morphologies, and of nothing else. */
  private clearMorphologies(): void {
    for (const mesh of this.layer?.meshes ?? []) {
      mesh.geometry.dispose();
      mesh.removeFromParent();
    }
    for (const mesh of this.layer?.ids ?? []) mesh.removeFromParent();
    this.layer = null;
    this.uniforms.uShift.value.set(0, 0, 0);
    this.invalidate();
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
    this.clearMorphologies();
    const { cloud } = this;
    cloud?.mesh.geometry.dispose();
    cloud?.mesh.removeFromParent();
    cloud?.ids.removeFromParent();
    this.cloud = null;
    this.table?.dispose();
    this.table = null;
    this.uniforms.uCells.value = null;
    this.uniforms.uGlow.value = null;
    this.cloudUniforms.uShade.value = null;
    this.uniforms.uHighlighted.value = NO_CELL;
    this.invalidate();
  }
}
