import * as THREE from 'three';

import { CANVAS_DARK, CANVAS_LIGHT } from '@/features/scan-config/components/color-by/contrast';
import { DEFAULT_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';
import { SceneViewer } from '@/features/viewer-3d/engine/scene-viewer';

import { CellTable } from './cell-table';
import { cellNearMiddle, idMaterial, impostor, impostorUniforms, NO_CELL } from './impostors';

import type { ThemeColors } from '@/features/viewer-3d/engine/looks';
import type { CellColors, CircuitMorphologyData, CircuitMorphologyView } from '../types';

/** A quad's corners, x, y, z after one another, and its two triangles, which face the eye. */
const CORNERS = [-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0];
const TRIANGLES = [0, 1, 2, 2, 1, 3];

/** What the highlighted cell is drawn in: as far from the background as no colour of a palette is. */
const HIGHLIGHT: ThemeColors = { light: '#1a1a1a', dark: '#ffffff' };

/** How far around the pixel asked for a pick looks, in CSS pixels, as the somas view does. */
const PICK_REACH = 4;

/** `instances` quads, for the caller to add the attributes a shader places each by. */
function quadGeometry(instances: number): THREE.InstancedBufferGeometry {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(CORNERS, 3));
  geometry.setIndex(TRIANGLES);
  geometry.instanceCount = instances;
  return geometry;
}

function quads(geometry: THREE.InstancedBufferGeometry, material: THREE.Material): THREE.Mesh {
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

/**
 * A circuit's morphologies on the shared scene, in the Studio look: a quad a segment and a quad a soma (`impostors.ts`),
 * each cell coloured and shown or not by its texel of the cell table.
 *
 * Frames go straight to the antialiased canvas, with no ambient occlusion: a flat quad has a flat depth. The arrays
 * are drawn from as the reader made them, and kept: after a lost context three uploads them again.
 */
export class CircuitMorphologyViewer extends SceneViewer implements CircuitMorphologyView {
  private uniforms = impostorUniforms();
  private somaMaterial: THREE.Material;
  private segments: THREE.Mesh | null = null;
  private somas: THREE.Mesh | null = null;
  /** The same quads in their cells' numbers, drawn for a pick alone. */
  private ids = new THREE.Scene();
  private idMaterials = {
    segment: idMaterial('segment', this.uniforms),
    soma: idMaterial('soma', this.uniforms),
  };
  private idTarget: THREE.WebGLRenderTarget | null = null;
  private table: CellTable | null = null;
  private colors: CellColors | null = null;
  private defaultColor = DEFAULT_NEURON_COLOR;
  private background = CANVAS_LIGHT;

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
      this.uniforms.uHighlight.value.set(HIGHLIGHT[theme]);
    };
    this.setDark(false);
  }

  protected override disposeContent(): void {
    this.clear();
    this.somaMaterial.dispose();
    this.idMaterials.segment.dispose();
    this.idMaterials.soma.dispose();
    this.idTarget?.dispose();
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
    this.table = new CellTable(data.somas.length / 4);
    this.uniforms.uCells.value = this.table.texture;
    this.paint();

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
    // Their programs begin to build now, not at the first pick, which would wait for them. Built for the pick's target:
    // three builds a program for the colour space and tone mapping of where it draws.
    const { renderer } = this;
    renderer.setRenderTarget(this.pickTarget());
    renderer.compile(this.ids, this.camera);
    renderer.setRenderTarget(null);

    this.bounds.set(new THREE.Vector3(...data.bounds.min), new THREE.Vector3(...data.bounds.max));
    this.resetView();
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
    for (const mesh of [this.segments, this.somas]) {
      mesh?.geometry.dispose();
      mesh?.removeFromParent();
    }
    this.segments = this.somas = null;
    this.ids.clear();
    this.table?.dispose();
    this.table = null;
    this.uniforms.uCells.value = null;
    this.uniforms.uHighlighted.value = NO_CELL;
    this.invalidate();
  }
}
