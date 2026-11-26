import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

import { AssetContentType } from '@/api/entitycore/types/shared/global';
import { getCachedBrainRegionMeshArrayBuffer } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/services/services';
import { ensureBrainRegionAtlasData } from '@/features/brain-atlas-viewer/queries';

import type { QueryClient } from '@tanstack/react-query';
import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type { IBrainModel, IBrainPart } from './brain-scene';

/**
 * A species' atlas from EntityCore (mouse, rat, …) as the explorer shows it: its brain in its major divisions, each
 * region's own mesh, coloured as the atlas colours them or as tissue, cortex and cerebellum the surface the Surface
 * slider turns to glass; and the region selected deeper than those, when it has a mesh, as a part of its own.
 */
const TISSUE = '#dcab9c';
/** The Allen mouse atlas's major divisions. */
const MOUSE_DIVISIONS = ['Isocortex', 'OLF', 'HPF', 'CTXsp', 'STR', 'PAL', 'TH', 'HY', 'MB', 'P', 'MY', 'CB'];
const MOUSE_SURFACE = new Set(['Isocortex', 'OLF', 'CB']);
/** The surface of an atlas with no list of its own. */
const isSurface = (r: IBrainRegionHierarchy) =>
  /cortex|cortical|cerebell|olfactory bulb/i.test(r.name) && !/subplate/i.test(r.name);
/** Every model is scaled to the human brain's size, which the explorer's views and distances are made for. */
const RADIUS = 125;
// The atlases' meshes have x backwards, y across and z down (seen in the mouse's). The explorer's frame: x to the
// right, y up, z backwards; a rotation, so the brain keeps its handedness.
const ATLAS_ROTATION = new THREE.Matrix3().set(0, -1, 0, 0, 0, -1, 1, 0, 0);

let gltfLoader: GLTFLoader | null = null;

function loader() {
  if (!gltfLoader) {
    const draco = new DRACOLoader();
    // three's own decoder, served from public/
    draco.setDecoderPath('/static/vendor/draco/');
    gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(draco);
  }
  return gltfLoader;
}

/** By the downloaded file, which the services keep one of per region. */
const geometries = new Map<ArrayBuffer, Promise<THREE.BufferGeometry>>();

/** A region's GLB as one geometry (positions and normals), decoded once for every viewer of it. */
function decodeMesh(data: ArrayBuffer): Promise<THREE.BufferGeometry> {
  let geometry = geometries.get(data);
  if (!geometry) {
    geometry = loader()
      .parseAsync(data, '')
      .then((gltf) => {
        gltf.scene.updateMatrixWorld(true);
        const found: THREE.BufferGeometry[] = [];
        gltf.scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
          for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
          found.push(g);
        });
        if (!found.length) throw new Error('The region’s file holds no mesh');
        const indexed = found.every((g) => g.index);
        const list = indexed ? found : found.map((g) => (g.index ? g.toNonIndexed() : g));
        const g = list.length === 1 ? list[0] : (mergeGeometries(list, false) ?? list[0]);
        if (!g.getAttribute('normal')) g.computeVertexNormals();
        g.computeBoundingBox();
        g.computeBoundingSphere();
        return g;
      });
    geometries.set(data, geometry);
    geometry.catch(() => geometries.delete(data));
  }
  return geometry;
}

async function regionGeometry(atlasId: string, regionId: string, queryClient: QueryClient) {
  const data = await getCachedBrainRegionMeshArrayBuffer({ atlasId, regionId, queryClient });
  return decodeMesh(data);
}

/** The regions of the atlas that have a mesh. */
async function meshRegions(atlasId: string, queryClient: QueryClient) {
  const atlas = await ensureBrainRegionAtlasData(queryClient, atlasId);
  return new Set(
    atlas.data
      .filter((e) =>
        e.assets?.some((a) => a.label === 'brain_atlas_region_mesh' && a.content_type === AssetContentType.gltf_binary)
      )
      .map((e) => e.brain_region_id)
  );
}

function flatten(root: IBrainRegionHierarchy): IBrainRegionHierarchy[] {
  const out: IBrainRegionHierarchy[] = [];
  const walk = (r: IBrainRegionHierarchy) => {
    out.push(r);
    for (const c of r.children ?? []) walk(c);
  };
  walk(root);
  return out;
}

const size = (r: IBrainRegionHierarchy): number => 1 + (r.children ?? []).reduce((n, c) => n + size(c), 0);

/**
 * The divisions to show the brain in: the mouse's major ones by name; for another atlas, opened down from its root
 * until there are a handful, each with a mesh.
 */
function divisionsOf(root: IBrainRegionHierarchy, has: Set<string>): IBrainRegionHierarchy[] {
  const byAcronym = new Map(flatten(root).map((r) => [r.acronym, r]));
  const mouse = MOUSE_DIVISIONS.map((a) => byAcronym.get(a)).filter(
    (r): r is IBrainRegionHierarchy => !!r && has.has(r.id)
  );
  if (mouse.length >= 8) return mouse;

  let frontier = [root];
  for (let round = 0; round < 8; round++) {
    const missing = frontier.filter((r) => !has.has(r.id) && r.children?.length);
    let open: Set<IBrainRegionHierarchy>;
    if (missing.length) open = new Set(missing);
    else if (frontier.length < 8) {
      const biggest = frontier
        .filter((r) => r.children?.length)
        .sort((a, b) => size(b) - size(a))[0];
      if (!biggest) break;
      open = new Set([biggest]);
    } else break;
    frontier = frontier.flatMap((r) => (open.has(r) ? r.children : [r]));
  }
  const shown = frontier.filter((r) => has.has(r.id)).slice(0, 30);
  return shown.length ? shown : has.has(root.id) ? [root] : [];
}

/** What the explorer should light for a selected region: divisions it is or holds, or a deeper region of its own. */
export function focusFor(
  root: IBrainRegionHierarchy,
  divisions: IBrainRegionHierarchy[],
  selectedId: string | null | undefined
): { focus: string[] | null; detail: IBrainRegionHierarchy | null; division: IBrainRegionHierarchy | null } {
  if (!selectedId || selectedId === root.id) return { focus: null, detail: null, division: null };
  const parents = new Map<string, IBrainRegionHierarchy>();
  const byId = new Map<string, IBrainRegionHierarchy>();
  for (const r of flatten(root)) {
    byId.set(r.id, r);
    for (const c of r.children ?? []) parents.set(c.id, r);
  }
  const selected = byId.get(selectedId);
  if (!selected) return { focus: null, detail: null, division: null };
  const ids = new Set(divisions.map((d) => d.id));
  // a division, or inside one
  for (let r: IBrainRegionHierarchy | undefined = selected; r; r = parents.get(r.id)) {
    if (ids.has(r.id)) {
      return r === selected
        ? { focus: [r.id], detail: null, division: r }
        : { focus: [selected.id], detail: selected, division: r };
    }
  }
  // holding some
  const inside = divisions.filter((d) => {
    for (let r: IBrainRegionHierarchy | undefined = d; r; r = parents.get(r.id)) if (r.id === selected.id) return true;
    return false;
  });
  return { focus: inside.length ? inside.map((d) => d.id) : null, detail: null, division: null };
}

export interface IAtlasModel extends IBrainModel {
  divisions: IBrainRegionHierarchy[];
}

const models = new Map<string, Promise<IAtlasModel>>();

/** The species' brain in its divisions, loaded once per atlas for every viewer of it. */
export function loadAtlasModel({
  atlasId,
  root,
  label,
  queryClient,
}: {
  atlasId: string;
  root: IBrainRegionHierarchy;
  label?: string;
  queryClient: QueryClient;
}): Promise<IAtlasModel> {
  const key = `${atlasId}:${root.id}`;
  let model = models.get(key);
  if (!model) {
    model = build({ atlasId, root, label, queryClient });
    models.set(key, model);
    model.catch(() => models.delete(key));
  }
  return model;
}

function partOf(r: IBrainRegionHierarchy, geometry: THREE.BufferGeometry, surface: boolean): IBrainPart {
  return {
    id: r.id,
    name: r.name,
    geometry,
    hemi: 'B',
    surface,
    colours: { natural: TISSUE, regions: `#${r.color_hex_triplet || 'cccccc'}` },
    finish: 'tissue',
    sulc: 0,
    regionId: r.id,
  };
}

async function build({
  atlasId,
  root,
  label,
  queryClient,
}: {
  atlasId: string;
  root: IBrainRegionHierarchy;
  label?: string;
  queryClient: QueryClient;
}): Promise<IAtlasModel> {
  const has = await meshRegions(atlasId, queryClient);
  const divisions = divisionsOf(root, has);
  const loaded = await Promise.all(
    divisions.map((r) =>
      regionGeometry(atlasId, r.id, queryClient)
        .then((g) => ({ r, g }))
        .catch(() => null)
    )
  );
  const ok = loaded.filter((x): x is { r: IBrainRegionHierarchy; g: THREE.BufferGeometry } => !!x);
  if (!ok.length) throw new Error('None of this atlas’s regions could be drawn');
  const box = new THREE.Box3();
  for (const { g } of ok) box.union(g.boundingBox!);
  const mouse = ok.some(({ r }) => MOUSE_SURFACE.has(r.acronym));
  return {
    key: `${atlasId}:${root.id}`,
    divisions: ok.map(({ r }) => r),
    parts: ok.map(({ r, g }) => partOf(r, g, mouse ? MOUSE_SURFACE.has(r.acronym) : isSurface(r))),
    frame: {
      centre: box.getCenter(new THREE.Vector3()),
      rotation: ATLAS_ROTATION,
      scale: RADIUS / (box.getSize(new THREE.Vector3()).length() / 2),
    },
    colourModes: ['natural', 'regions'],
    colourMode: 'regions',
    label,
  };
}

/** A region deeper than the divisions, as a part of its own, or null when the atlas has no mesh of it. */
export async function loadRegionPart({
  atlasId,
  region,
  queryClient,
}: {
  atlasId: string;
  region: IBrainRegionHierarchy;
  queryClient: QueryClient;
}): Promise<IBrainPart | null> {
  const has = await meshRegions(atlasId, queryClient);
  if (!has.has(region.id)) return null;
  const geometry = await regionGeometry(atlasId, region.id, queryClient);
  const part = partOf(region, geometry, false);
  // its own colour whatever the brain's, so it stands out
  part.colours.natural = part.colours.regions!;
  return part;
}
