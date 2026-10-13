import * as THREE from 'three';

import { CANVAS_DARK, CANVAS_LIGHT } from '@/features/scan-config/components/color-by/contrast';
import { PLAIN } from '@/features/viewer-3d/engine/looks';
import { SceneViewer } from '@/features/viewer-3d/engine/scene-viewer';

import { CellTable } from './cell-table';
import { impostor, impostorUniforms } from './impostors';

import type { CellColors, CircuitMorphologyData, CircuitMorphologyView } from '../types';

/** A quad's corners, x, y, z after one another, and its two triangles, which face the eye. */
const CORNERS = [-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0];
const TRIANGLES = [0, 1, 2, 2, 1, 3];

/** A mesh of `instances` quads, for the caller to add the attributes `material`'s shader places each by. */
function quads(instances: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(CORNERS, 3));
  geometry.setIndex(TRIANGLES);
  geometry.instanceCount = instances;
  const mesh = new THREE.Mesh(geometry, material);
  // The geometry's own four corners say nothing of where the quads are.
  mesh.frustumCulled = false;
  mesh.visible = instances > 0;
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
  private table: CellTable | null = null;
  private colors: CellColors | null = null;
  private background = CANVAS_LIGHT;
  /** What a cell with no colour of its own is drawn in. */
  private ownColor = PLAIN.light;

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
      this.ownColor = PLAIN[theme];
      this.paint();
    };
    this.setDark(false);
  }

  protected override disposeContent(): void {
    this.clear();
    this.somaMaterial.dispose();
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

    this.segments = quads(data.segmentCells.length, this.look.material);
    const ends = new THREE.InstancedInterleavedBuffer(data.segments, 8);
    this.segments.geometry
      .setAttribute('aA', new THREE.InterleavedBufferAttribute(ends, 4, 0))
      .setAttribute('aB', new THREE.InterleavedBufferAttribute(ends, 4, 4))
      .setAttribute('aCell', new THREE.InstancedBufferAttribute(data.segmentCells, 1));
    this.chunks.add(this.segments);

    const { spheres, cells } = placedSomas(data.somas);
    this.somas = quads(cells.length, this.somaMaterial);
    this.somas.geometry
      .setAttribute('aSoma', new THREE.InstancedBufferAttribute(spheres, 4))
      .setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 1));
    // Beside `chunks`, whose meshes all take the look's material.
    this.surfaces.add(this.somas);

    this.bounds.set(new THREE.Vector3(...data.bounds.min), new THREE.Vector3(...data.bounds.max));
    this.resetView();
  }

  setCellColors(colors: CellColors | null): void {
    this.colors = colors;
    this.paint();
  }

  private paint(): void {
    if (!this.table) return;
    this.table.paint(this.colors, this.ownColor);
    this.invalidate();
  }

  private clear(): void {
    for (const mesh of [this.segments, this.somas]) {
      mesh?.geometry.dispose();
      mesh?.removeFromParent();
    }
    this.segments = this.somas = null;
    this.table?.dispose();
    this.table = null;
    this.uniforms.uCells.value = null;
    this.invalidate();
  }
}
