// @vitest-environment node
import { File as H5File, ready } from 'h5wasm';
import { beforeAll, describe, expect, it } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { paintSpines } from '@/features/entities/cell-morphology/spiny-comparison/engine/colours';
import {
  pathDistances,
  placeVertices,
} from '@/features/entities/cell-morphology/spiny-comparison/engine/geometry';
import { gridLayout } from '@/features/entities/cell-morphology/spiny-comparison/engine/grid';
import { shareInside } from '@/features/entities/cell-morphology/spiny-comparison/engine/mesh-centre';
import { readSpiny } from '@/features/entities/cell-morphology/spiny-comparison/engine/read-spiny';
import {
  alongPath,
  dendritePaths,
  frames,
  resample,
  slerpDirection,
  turnAbout,
} from '@/features/entities/cell-morphology/spiny-comparison/engine/tour';
import { meshHints } from '@/features/entities/cell-morphology/spiny-comparison/find-mesh';
import { ActivityCustomFileRenderer } from '@/features/scan-config/types';
import {
  inputMeshId,
  spinyComparisonFiles,
} from '@/features/scan-config/use-cases/skeletonization/spiny-output';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';
import type { IAsset } from '@/api/entitycore/types/shared/global';

const NAME = 'neuron';
const LIB = 'neuron';

/** A tetrahedron upright in a spine's own frame: its base round the origin, its tip at y = 1. */
const TETRA_VERTICES = [0, 0, 0, 0.2, 0, 0, 0, 0, 0.2, 0, 1, 0];
const TETRA_TRIANGLES = [0, 2, 1, 0, 1, 3, 1, 2, 3, 2, 0, 3];

/**
 * A spiny H5 as morph-spines writes it: a soma and two sections in a line (2 µm, then 3 µm, along x), a soma mesh, two
 * stored spines, and a spine table whose two rows name them in the other order. Row 0 is stored spine 1, on section 2,
 * half way along; row 1 is stored spine 0, on section 1, at its start, turned 90° about z.
 */
function writeSpinyFile(path: string): void {
  const f = new H5File(path, 'w');
  for (const g of [
    'morphology',
    `morphology/${NAME}`,
    'edges',
    `edges/${NAME}`,
    `edges/${NAME}/metadata`,
    'soma',
    'soma/meshes',
    `soma/meshes/${NAME}`,
    'spines',
    'spines/meshes',
    `spines/meshes/${LIB}`,
  ])
    f.create_group(g);
  // x, y, z, diameter: the soma's contour, then section 1 from x = 0 to 2, then section 2 from 2 to 5
  f.create_dataset({
    name: `morphology/${NAME}/points`,
    data: Float64Array.from([
      -1, 0, 0, 2, 1, 0, 0, 2, 0, 0, 0, 1, 2, 0, 0, 1, 2, 0, 0, 1, 5, 0, 0, 1,
    ]),
    shape: [6, 4],
  });
  f.create_dataset({
    name: `morphology/${NAME}/structure`,
    data: Int32Array.from([0, 1, -1, 2, 3, 0, 4, 3, 1]),
    shape: [3, 3],
  });
  f.create_dataset({
    name: `soma/meshes/${NAME}/vertices`,
    data: Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    shape: [3, 3],
  });
  f.create_dataset({
    name: `soma/meshes/${NAME}/triangles`,
    data: BigInt64Array.from([0, 1, 2], BigInt),
    shape: [1, 3],
  });
  f.create_dataset({
    name: `spines/meshes/${LIB}/vertices`,
    data: Float64Array.from([...TETRA_VERTICES, ...TETRA_VERTICES]),
    shape: [8, 3],
  });
  f.create_dataset({
    name: `spines/meshes/${LIB}/triangles`,
    data: BigInt64Array.from([...TETRA_TRIANGLES, ...TETRA_TRIANGLES], BigInt),
    shape: [8, 3],
  });
  f.create_dataset({
    name: `spines/meshes/${LIB}/offsets`,
    data: BigInt64Array.from([0, 0, 4, 4, 8, 8], BigInt),
    shape: [3, 2],
  });
  const s = Math.SQRT1_2;
  const columns: Record<string, Float64Array | BigInt64Array> = {
    spine_id: BigInt64Array.from([1, 0], BigInt),
    afferent_section_id: BigInt64Array.from([2, 1], BigInt),
    afferent_section_pos: Float64Array.from([0.5, 0]),
    afferent_segment_id: BigInt64Array.from([0, 0], BigInt),
    afferent_segment_offset: Float64Array.from([1.5, 0]),
    afferent_surface_x: Float64Array.from([3.5, 0]),
    afferent_surface_y: Float64Array.from([0.5, 0.5]),
    afferent_surface_z: Float64Array.from([0, 0]),
    afferent_center_x: Float64Array.from([3.5, 0]),
    afferent_center_y: Float64Array.from([0, 0]),
    afferent_center_z: Float64Array.from([0, 0]),
    spine_length: Float64Array.from([1, 2]),
    spine_orientation_vector_x: Float64Array.from([0, -1]),
    spine_orientation_vector_y: Float64Array.from([1, 0]),
    spine_orientation_vector_z: Float64Array.from([0, 0]),
    spine_rotation_x: Float64Array.from([0, 0]),
    spine_rotation_y: Float64Array.from([0, 0]),
    spine_rotation_z: Float64Array.from([0, s]),
    spine_rotation_w: Float64Array.from([1, s]),
  };
  for (const [c, data] of Object.entries(columns))
    f.create_dataset({ name: `edges/${NAME}/${c}`, data });
  f.create_dataset({ name: `edges/${NAME}/spine_morphology`, data: [LIB, LIB] });
  f.close();
}

function near(a: ArrayLike<number>, b: number[]) {
  for (const [i, v] of b.entries()) expect(a[i]).toBeCloseTo(v, 5);
}

describe('placeVertices', () => {
  it('turns by the quaternion (x, y, z, w) and then moves', () => {
    const out = new Float32Array(6);
    const s = Math.SQRT1_2;
    placeVertices([1, 0, 0, 0, 1, 0], [0, 0, s, s], [10, 20, 30], out, 0);
    near(out, [10, 21, 30, 9, 20, 30]);
  });
});

describe('pathDistances', () => {
  it('starts each section where its parent ends, the soma counting for none', () => {
    const points = (xs: number[]) => Float64Array.from(xs.flatMap((x) => [x, 0, 0, 0.5]));
    const { start, length } = pathDistances([
      { type: 1, parent: -1, points: points([-1, 1]) },
      { type: 3, parent: 0, points: points([0, 2]) },
      { type: 3, parent: 1, points: points([2, 5]) },
      { type: 3, parent: 2, points: points([5, 6]) },
    ]);
    expect([...start]).toEqual([0, 0, 2, 5]);
    expect([...length]).toEqual([0, 2, 3, 1]);
  });
});

describe('readSpiny', () => {
  const PATH = '/spiny-test.h5';
  beforeAll(async () => {
    await ready;
    writeSpinyFile(PATH);
  });

  it('reads the skeleton, soma and every row of the spine table, placed', () => {
    const file = new H5File(PATH, 'r');
    try {
      const data = readSpiny(file, () => {});
      expect(data.name).toBe(NAME);
      expect(data.counts).toMatchObject({
        sections: 3,
        skeletonPoints: 6,
        spines: 2,
        spineVertices: 8,
        spineTriangles: 8,
        somaTriangles: 1,
      });
      // only the two neurite sections are tubes, both basal dendrite
      expect([...new Set(data.skeleton.types)]).toEqual([3]);
      expect([...new Set(data.skeleton.sections)].sort()).toEqual([1, 2]);

      const s = data.spines;
      // read in the order they are stored: stored spine 0 is row 1, stored spine 1 row 0
      expect([...s.row]).toEqual([1, 0]);
      expect([...s.vertexStart]).toEqual([0, 4, 8]);
      // row 1's tip, (0, 1, 0) turned 90° about z, then moved to (0, 0.5, 0)
      near(s.positions.subarray(9, 12), [-1, 0.5, 0]);
      // row 0's tip, not turned, moved to (3.5, 0.5, 0)
      near(s.positions.subarray(21, 24), [3.5, 1.5, 0]);
      // the second spine's triangles index its own vertices
      expect(Math.min(...s.indices.subarray(12))).toBe(4);
      expect(Math.max(...s.indices.subarray(12))).toBe(7);
      // section 1 starts at the soma; section 2 starts 2 µm out, and row 0 is half way along its 3 µm
      near(s.somaDistance, [0, 3.5]);
      near(s.length, [2, 1]);
      // each row's rotation kept, and each section's type
      near(s.rotation.subarray(0, 4), [0, 0, Math.SQRT1_2, Math.SQRT1_2]);
      expect([...data.sectionTypes]).toEqual([1, 3, 3]);
      expect([...s.section]).toEqual([1, 2]);
      // every normal a unit vector of bytes
      for (let v = 0; v < 8; v++) {
        const n = Math.hypot(s.normals[3 * v], s.normals[3 * v + 1], s.normals[3 * v + 2]);
        expect(n).toBeGreaterThan(120);
        expect(n).toBeLessThan(134);
      }
      // coloured by distance from the soma, the nearer spine and the farther one differ
      const colours = new Uint8Array(3 * 8);
      paintSpines(colours, s, 'distance');
      expect([...colours.subarray(0, 3)]).not.toEqual([...colours.subarray(12, 15)]);
    } finally {
      file.close();
    }
  });
});

describe('the skeletonization output rows', () => {
  const asset = (label: AssetLabel, contentType: AssetContentType, id: string) =>
    ({ id, label, content_type: contentType, size: 10, path: id }) as unknown as IAsset;
  const mesh = {
    id: 'mesh-1',
    name: 'MICrONS 1',
    assets: [asset(AssetLabel.cell_surface_mesh, AssetContentType.gltf_binary, 'glb')],
  } as unknown as IEMCellMesh;
  const morphology = (id: string, spiny: boolean) =>
    ({
      id,
      name: id,
      assets: [
        asset(AssetLabel.morphology, AssetContentType.swc, `${id}-swc`),
        ...(spiny
          ? [asset(AssetLabel.morphology_with_spines, AssetContentType.h5, `${id}-h5`)]
          : []),
      ],
    }) as unknown as ICellMorphology;

  it('finds the config’s input mesh', () => {
    const input = (id: string, type?: string) => ({
      id,
      type,
      authorized_project_id: null,
      authorized_public: true,
    });
    expect(
      inputMeshId({
        inputs: [
          input('d', 'em_dense_reconstruction_dataset'),
          input('m', EntityTypeDict.EMCellMesh),
        ],
      } as never)
    ).toBe('m');
    expect(inputMeshId({ inputs: [input('only')] } as never)).toBe('only');
    expect(inputMeshId({ inputs: [] } as never)).toBeNull();
  });

  it('adds a 3D row for each morphology with a spiny H5, on a mesh with a GLB', () => {
    const files = spinyComparisonFiles(mesh, [morphology('a', true), morphology('b', false)]);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      id: 'spiny-comparison-a',
      renderer: ActivityCustomFileRenderer.SpinyComparison,
      mesh: { id: 'mesh-1', name: 'MICrONS 1', asset: { id: 'glb' } },
      morphology: { id: 'a', asset: { id: 'a-h5' } },
    });
    expect(spinyComparisonFiles({ ...mesh, assets: [] }, [morphology('a', true)])).toEqual([]);
    expect(spinyComparisonFiles(null, [morphology('a', true)])).toEqual([]);
  });
});

describe('gridLayout', () => {
  /** Five spines: on sections 2 (apical), 1 (basal), 2, 1 and 1, at the distances given. */
  const spines = {
    vertexStart: Uint32Array.from([0, 1, 2, 3, 4, 5]),
    section: Int32Array.from([2, 1, 2, 1, 1]),
    somaDistance: Float32Array.from([30, 20, 10, 5, 40]),
    length: Float32Array.from([1, 1, 2, 1, 1]),
  } as unknown as Parameters<typeof gridLayout>[0];
  const sectionTypes = Uint8Array.from([1, 3, 4]);

  it('makes a block per section type, basal first, each in order of section and distance', () => {
    const g = gridLayout(spines, sectionTypes);
    expect(g.blocks.map((b) => [b.type, b.count])).toEqual([
      [3, 3],
      [4, 2],
    ]);
    // the basal spines by distance (3, 1, 4), then the apical (2, 0)
    const byOrder = [0, 1, 2, 3, 4].sort((a, b) => g.order[a] - g.order[b]);
    expect(byOrder).toEqual([3, 1, 4, 2, 0]);
    expect(g.order[3]).toBe(0);
    expect(g.order[0]).toBe(1);
    // every spine in a slot of its own, within its block, the blocks side by side
    const slots = new Set([0, 1, 2, 3, 4].map((i) => `${g.slots[2 * i]},${g.slots[2 * i + 1]}`));
    expect(slots.size).toBe(5);
    const [basal, apical] = g.blocks;
    expect(apical.x).toBeGreaterThan(basal.x + basal.width);
    for (const i of [3, 1, 4]) {
      expect(g.slots[2 * i]).toBeGreaterThan(basal.x);
      expect(g.slots[2 * i]).toBeLessThan(basal.x + basal.width);
    }
    // centred on 0
    expect(basal.x).toBeCloseTo(-g.width / 2, 5);
  });
});

describe('the fly-throughs’ paths', () => {
  it('resamples a polyline at even steps, ends kept', () => {
    const out = resample(
      [
        [0, 0, 0],
        [1, 0, 0],
        [1, 2, 0],
      ],
      0.5
    );
    expect(out).toHaveLength(7);
    near(out[2], [1, 0, 0]);
    near(out[6], [1, 2, 0]);
  });

  it('keeps the up across the tangent, turning with the path', () => {
    const { tangents, ups } = frames(
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [2, 1, 0],
        [2, 2, 0],
      ],
      [0, 1, 0]
    );
    for (const [i, t] of tangents.entries()) {
      expect(Math.abs(t[0] * ups[i][0] + t[1] * ups[i][1] + t[2] * ups[i][2])).toBeLessThan(1e-6);
      expect(Math.hypot(...ups[i])).toBeCloseTo(1, 6);
    }
    near(ups[0], [0, 1, 0]);
  });

  it('goes from the soma to the spiniest tip first', () => {
    // a soma, a stem, and two branches off it: the second branch has the spines
    const pts = (xs: [number, number][]) => xs.flatMap(([x, y]) => [x, y, 0, 0.5]);
    const sectionPoints = Float32Array.from([
      ...pts([
        [-1, 0],
        [1, 0],
      ]),
      ...pts([
        [0, 0],
        [10, 0],
      ]),
      ...pts([
        [10, 0],
        [20, 10],
      ]),
      ...pts([
        [10, 0],
        [20, -10],
      ]),
    ]);
    const data = {
      sectionPoints,
      pointStart: Uint32Array.from([0, 2, 4, 6, 8]),
      sectionParent: Int32Array.from([-1, 0, 1, 1]),
      sectionTypes: Uint8Array.from([1, 3, 3, 3]),
      spines: { section: Int32Array.from([3, 3, 1, 2]) },
    } as unknown as Parameters<typeof dendritePaths>[0];
    const paths = dendritePaths(data, [0, 0, 1]);
    expect(paths.map((p) => [p.sections, p.spines])).toEqual([
      [[1, 3], 3],
      [[1, 2], 2],
    ]);
    expect(paths[0].length).toBeCloseTo(10 + Math.hypot(10, 10), 5);
    // along it, from the soma out, its radius the skeleton's
    const start = alongPath(paths[0], 0);
    const end = alongPath(paths[0], paths[0].length);
    expect(start.point[0]).toBeLessThan(end.point[0]);
    expect(end.point[1]).toBeLessThan(0);
    expect(start.radius).toBeCloseTo(0.5, 5);
  });

  it('turns directions the short way round, and about an axis', () => {
    near(slerpDirection([1, 0, 0], [0, 1, 0], 0.5), [Math.SQRT1_2, Math.SQRT1_2, 0]);
    near(slerpDirection([1, 0, 0], [0, 1, 0], 1), [0, 1, 0]);
    // opposite: some way round, still a unit vector across both
    const half = slerpDirection([1, 0, 0], [-1, 0, 0], 0.5);
    expect(Math.hypot(...half)).toBeCloseTo(1, 6);
    expect(half[0]).toBeCloseTo(0, 6);
    near(turnAbout([1, 0, 0], [0, 0, 1], Math.PI / 2), [0, 1, 0]);
  });
});

describe('finding a spiny morphology’s mesh', () => {
  it('reads the mesh id from a workflow output’s name, and the cell id from a name or description', () => {
    expect(meshHints({ name: '353b3e46-7f01-440b-a464-f80ea67c488a', description: '' })).toEqual({
      meshId: '353b3e46-7f01-440b-a464-f80ea67c488a',
      cellId: null,
    });
    // kept as digits: 864691136330101226 is past what a number holds exactly
    expect(meshHints({ name: 'MICrONS neuron 864691136330101226', description: '' })).toEqual({
      meshId: null,
      cellId: '864691136330101226',
    });
    expect(
      meshHints({
        name: 'my morphology',
        description: 'Reconstructed morphology and extracted spines of neuron 864691136053465.',
      }).cellId
    ).toBe('864691136053465');
    expect(meshHints({ name: 'L5 TPC 2021', description: 'no id here' })).toEqual({
      meshId: null,
      cellId: null,
    });
  });

  it('measures how much of the skeleton’s box lies inside the mesh’s', () => {
    const mesh = { min: [0, 0, 0], max: [10, 10, 10] } as never;
    expect(shareInside({ min: [1, 1, 1], max: [9, 9, 9] }, mesh)).toBe(1);
    expect(shareInside({ min: [5, 0, 0], max: [15, 10, 10] }, mesh)).toBeCloseTo(0.5, 6);
    expect(shareInside({ min: [20, 0, 0], max: [30, 10, 10] }, mesh)).toBe(0);
  });
});
