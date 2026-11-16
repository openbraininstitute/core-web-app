import * as THREE from 'three';

import type { IBrainModel, IBrainPart } from './brain-scene';

/**
 * The human brain the explorer shows in place of the Julich atlas (the user asked): FreeSurfer surfaces of one adult
 * brain from "Brain for Blender" (Anderson M. Winkler, brainder.org, CC BY-SA 3.0), the cortex in the
 * Desikan–Killiany regions and the deep structures from FreeSurfer's subcortical segmentation. The meshes are
 * packed as `public/static/atlas/human-brain/brain.bin`, laid out by its `manifest.json`: per mesh, int16 positions
 * (÷ `q`, mm), int8 normals with the sulcal depth as a fourth, and 16 or 32-bit indices.
 */
export const HUMAN_CREDITS =
  'Brain surfaces: “Brain for Blender” by Anderson M. Winkler (brainder.org), FreeSurfer reconstructions of one adult brain, CC BY-SA 3.0. Cortical regions after the Desikan–Killiany atlas.';
export const HUMAN_LABEL = 'Desikan–Killiany human brain';

const BASE = '/static/atlas/human-brain';

/** Groups the regions sit in: the cortex's lobes and the deep parts. */
const GROUPS: Record<string, { name: string; color: string }> = {
  frontal: { name: 'Frontal lobe', color: '#5b8def' },
  parietal: { name: 'Parietal lobe', color: '#e8b23f' },
  temporal: { name: 'Temporal lobe', color: '#4fbf8b' },
  occipital: { name: 'Occipital lobe', color: '#e8718a' },
  limbic: { name: 'Cingulate cortex', color: '#a67be8' },
  insular: { name: 'Insular lobe', color: '#3fc1c9' },
  cortex: { name: 'Cerebral cortex', color: '#d9a79a' },
  basalganglia: { name: 'Basal ganglia', color: '#b06fd8' },
  deep: { name: 'Deep structures', color: '#b58ad6' },
  cerebellum: { name: 'Cerebellum', color: '#e0a15e' },
  brainstem: { name: 'Brainstem', color: '#c9b98a' },
  ventricles: { name: 'Ventricular system', color: '#5fb7e8' },
};

/** Each mesh's region: its name, its group and its colour. */
const REGIONS: Record<string, [name: string, group: string, color: string]> = {
  precentral: ['Precentral gyrus', 'frontal', '#3f74e0'],
  paracentral: ['Paracentral lobule', 'frontal', '#527fe6'],
  superiorfrontal: ['Superior frontal gyrus', 'frontal', '#6a97f2'],
  caudalmiddlefrontal: ['Caudal middle frontal gyrus', 'frontal', '#4c83ea'],
  rostralmiddlefrontal: ['Rostral middle frontal gyrus', 'frontal', '#7aa5f5'],
  parsopercularis: ['Pars opercularis', 'frontal', '#3566d6'],
  parstriangularis: ['Pars triangularis', 'frontal', '#4673dc'],
  parsorbitalis: ['Pars orbitalis', 'frontal', '#5c86e6'],
  lateralorbitofrontal: ['Lateral orbitofrontal cortex', 'frontal', '#86aef7'],
  medialorbitofrontal: ['Medial orbitofrontal cortex', 'frontal', '#94b8f8'],
  frontalpole: ['Frontal pole', 'frontal', '#a5c4fa'],
  postcentral: ['Postcentral gyrus', 'parietal', '#dfa226'],
  superiorparietal: ['Superior parietal lobule', 'parietal', '#edbc52'],
  inferiorparietal: ['Inferior parietal lobule', 'parietal', '#f0c868'],
  supramarginal: ['Supramarginal gyrus', 'parietal', '#e6ae35'],
  precuneus: ['Precuneus', 'parietal', '#f5d27f'],
  superiortemporal: ['Superior temporal gyrus', 'temporal', '#38b07a'],
  transversetemporal: ['Transverse temporal gyrus', 'temporal', '#2a9d69'],
  bankssts: ['Banks of the superior temporal sulcus', 'temporal', '#5ccb99'],
  middletemporal: ['Middle temporal gyrus', 'temporal', '#49c08c'],
  inferiortemporal: ['Inferior temporal gyrus', 'temporal', '#6fd3a5'],
  fusiform: ['Fusiform gyrus', 'temporal', '#33a874'],
  parahippocampal: ['Parahippocampal gyrus', 'temporal', '#58c495'],
  entorhinal: ['Entorhinal cortex', 'temporal', '#259463'],
  temporalpole: ['Temporal pole', 'temporal', '#7edbb0'],
  pericalcarine: ['Pericalcarine cortex', 'occipital', '#d94f6e'],
  cuneus: ['Cuneus', 'occipital', '#e26380'],
  lingual: ['Lingual gyrus', 'occipital', '#ec7d96'],
  lateraloccipital: ['Lateral occipital cortex', 'occipital', '#f394a9'],
  rostralanteriorcingulate: ['Rostral anterior cingulate', 'limbic', '#9565e0'],
  caudalanteriorcingulate: ['Caudal anterior cingulate', 'limbic', '#a67be8'],
  posteriorcingulate: ['Posterior cingulate', 'limbic', '#b791ee'],
  isthmuscingulate: ['Isthmus of the cingulate', 'limbic', '#c7a8f3'],
  insula: ['Insula', 'insular', '#3fc1c9'],
  unknown: ['Medial wall', 'cortex', '#8d8a94'],
  caudate: ['Caudate nucleus', 'basalganglia', '#c084e8'],
  putamen: ['Putamen', 'basalganglia', '#a85fd0'],
  pallidum: ['Globus pallidus', 'basalganglia', '#8f5fbf'],
  accumbens: ['Nucleus accumbens', 'basalganglia', '#d99be8'],
  thalamus: ['Thalamus', 'deep', '#e87d5f'],
  ventraldc: ['Ventral diencephalon', 'deep', '#d6694d'],
  hippocampus: ['Hippocampus', 'deep', '#f0c14b'],
  amygdala: ['Amygdala', 'deep', '#e85d75'],
  corpuscallosum: ['Corpus callosum', 'deep', '#f1ead8'],
  cerebellarcortex: ['Cerebellar cortex', 'cerebellum', '#e0a15e'],
  cerebellarwm: ['Cerebellar white matter', 'cerebellum', '#f3e2c2'],
  midbrain: ['Midbrain', 'brainstem', '#d4c08a'],
  pons: ['Pons', 'brainstem', '#c9b072'],
  medulla: ['Medulla oblongata', 'brainstem', '#b89f5e'],
  lateralventricle: ['Lateral ventricles', 'ventricles', '#5fb7e8'],
  thirdventricle: ['Third ventricle', 'ventricles', '#49a3d9'],
  fourthventricle: ['Fourth ventricle', 'ventricles', '#3a8fc9'],
};

const TISSUE = '#dcab9c';

interface IManifestMesh {
  id: string;
  key: string;
  hemi: 'L' | 'R' | 'M';
  kind: 'cortex' | 'deep';
  nv: number;
  nt: number;
  idx32: boolean;
  pOff: number;
  nOff: number;
  iOff: number;
  c: [number, number, number];
  mn: [number, number, number];
  mx: [number, number, number];
}

let human: Promise<IBrainModel> | null = null;

/** The human brain, loaded once for every viewer of it (its geometries hold no WebGL state). */
export function loadHumanBrain(): Promise<IBrainModel> {
  human ??= build().catch((error) => {
    human = null;
    throw error;
  });
  return human;
}

async function build(): Promise<IBrainModel> {
  const [manifest, buf] = await Promise.all([
    fetch(`${BASE}/manifest.json`).then((r) => {
      if (!r.ok) throw new Error(`The human brain's manifest did not load (${r.status})`);
      return r.json() as Promise<{ q: number; meshes: IManifestMesh[] }>;
    }),
    fetch(`${BASE}/brain.bin`).then((r) => {
      if (!r.ok) throw new Error(`The human brain's meshes did not load (${r.status})`);
      return r.arrayBuffer();
    }),
  ]);
  const mn = [Infinity, Infinity, Infinity];
  const mx = [-Infinity, -Infinity, -Infinity];
  for (const m of manifest.meshes) {
    for (let k = 0; k < 3; k++) {
      mn[k] = Math.min(mn[k], m.mn[k]);
      mx[k] = Math.max(mx[k], m.mx[k]);
    }
  }
  const C = mn.map((v, k) => (v + mx[k]) / 2);
  // the cerebellum's middle, for its folia
  const cb = manifest.meshes.filter((m) => m.key === 'cerebellarcortex');
  const folia = new THREE.Vector3(
    0,
    (cb[0].c[1] + cb[1].c[1]) / 2 - C[1] + 4,
    (cb[0].c[2] + cb[1].c[2]) / 2 - C[2] - 6
  );

  const parts: IBrainPart[] = [];
  for (const m of manifest.meshes) {
    const P = new Int16Array(buf, m.pOff, m.nv * 3);
    const N = new Int8Array(buf, m.nOff, m.nv * 4);
    const I = m.idx32 ? new Uint32Array(buf, m.iOff, m.nt * 3) : new Uint16Array(buf, m.iOff, m.nt * 3);
    const pos = new Float32Array(m.nv * 3);
    const nrm = new Float32Array(m.nv * 3);
    const sulc = new Float32Array(m.nv);
    for (let i = 0; i < m.nv; i++) {
      for (let k = 0; k < 3; k++) {
        pos[i * 3 + k] = P[i * 3 + k] / manifest.q - C[k];
        nrm[i * 3 + k] = N[i * 4 + k] / 127;
      }
      sulc[i] = N[i * 4 + 3] / 127;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    geometry.setAttribute('aSulc', new THREE.BufferAttribute(sulc, 1));
    geometry.setIndex(new THREE.BufferAttribute(I, 1));
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();

    const [name, groupKey, color] = REGIONS[m.key] ?? [m.key, 'cortex', '#999999'];
    const group = GROUPS[groupKey];
    const cortex = m.kind === 'cortex';
    const lobeColour = cortex
      ? new THREE.Color(group.color).lerp(new THREE.Color(TISSUE), 0.06).getStyle()
      : color;
    const natural = cortex ? TISSUE : m.key === 'cerebellarcortex' ? '#d29f8b' : color;
    parts.push({
      id: m.id,
      regionId: m.key,
      name,
      group: group.name,
      geometry,
      hemi: m.hemi,
      surface: cortex || m.key === 'cerebellarcortex',
      colours:
        m.key === 'unknown'
          ? { natural: '#c9b3ab', lobes: '#8f8b97', regions: '#8f8b97' }
          : { natural, lobes: lobeColour, regions: color },
      finish: m.key.endsWith('ventricle')
        ? 'fluid'
        : m.key === 'corpuscallosum' || m.key === 'cerebellarwm'
          ? 'white'
          : 'tissue',
      sulc: cortex || m.key === 'cerebellarcortex' ? 1 : 0.75,
      folia: m.key === 'cerebellarcortex' ? folia : undefined,
    });
    // a breath now and then, so the page keeps responding while the brain is built
    if (parts.length % 16 === 0) await new Promise((r) => setTimeout(r));
  }
  return {
    key: 'human',
    parts,
    frame: { centre: new THREE.Vector3(), rotation: new THREE.Matrix3(), scale: 1 },
    colourModes: ['natural', 'lobes', 'regions'],
    colourMode: 'lobes',
    label: HUMAN_LABEL,
    credits: HUMAN_CREDITS,
  };
}
