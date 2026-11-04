import { CANVAS_WHITE } from '@/features/scan-config/components/color-by/contrast';
import { FLY_PACK, L6_PACK } from '@/ui/segments/project/models/repo-packs';

import type { EmViewerSettings } from '@/features/entities/em-cell-mesh/viewer/use-em-viewer-settings';
import type { ViewerConfig } from '@/features/scan-config/components/color-by/types';
import type { WorkspaceContext } from '@/types/common';
import type {
  TProjectHomeGetStartedCard,
  TTutorial,
} from '@/ui/segments/project/get-started/query';
import type { RepoPack } from '@/ui/segments/project/models/repo-packs';

/** What the stage can show, picked from the row below it. */
export type TStartItem =
  | {
      kind: 'tutorial';
      key: string;
      title: string;
      video: string;
      poster: string;
    }
  | {
      kind: 'animation';
      key: string;
      /** The section it introduces: Data, Workflows or Notebooks. */
      section: string;
      title: string;
      description: string;
      video: string;
      /** The section's page, relative to the project. */
      href: string;
    }
  | ({ kind: 'circuit'; key: string } & ICircuitExample)
  | ({ kind: 'mesh'; key: string } & IMeshExample);

export interface IMeshExample {
  title: string;
  meshId: string;
  /** Which reconstruction it comes from, under its title. */
  source: string;
  /** The mesh viewer's settings to begin with. */
  viewerDefaults: Partial<EmViewerSettings>;
  /** A picture of it for its card; a plain tile without one. */
  art?: string;
}

export interface ICircuitExample {
  title: string;
  circuitId: string;
  /** The project a private circuit belongs to, the only one it can be read from; none when public. */
  workspace?: WorkspaceContext;
  /** The viewer's settings to begin with; a module constant, as a new object starts them over. */
  viewerDefaults: Partial<ViewerConfig>;
  /** The zoom the view is framed at, below 1 to see all of a circuit that fills it. */
  frameZoom?: number;
  /** The one population drawn, of a circuit whose others, its inputs, are not worth loading. */
  population?: string;
  /** A picture of it for its card; a plain tile without one. */
  art?: string;
  /** What stands in for it, in one colour, where it cannot be read: signed out, or in another project. */
  repoPack?: RepoPack;
}

/** Shared results + tests on staging, where the two private circuits live with their morphology packs. */
export const SHARED_RESULTS_AND_TESTS: WorkspaceContext = {
  virtualLabId: 'e6030ed8-a589-4be2-80a6-f975406eb1f6',
  projectId: '2720f785-a3a2-4472-969d-19a53891c817',
};

/** Morphologies where the circuit has its pack, without axons, turning, on white, with no scale bar. */
export const HOME_VIEWER: Partial<ViewerConfig> = {
  representation: 'morphologies',
  showAxons: false,
  spin: true,
  backgroundColor: CANVAS_WHITE,
  showScalebar: false,
};

export const CIRCUIT_EXAMPLES: Array<{ key: string } & ICircuitExample> = [
  {
    key: 'nbs1-hex0-l6',
    title: 'nbS1-HEX0-L6 microcircuit',
    circuitId: '3b5a619c-0dfb-405b-aa27-55c25419d3d3',
    workspace: SHARED_RESULTS_AND_TESTS,
    viewerDefaults: { ...HOME_VIEWER, colorByProperty: { S1nonbarrel_neurons: 'mtype' } },
    frameZoom: 0.33,
    art: '/images/start/examples/nbs1-hex0-l6.jpg',
    repoPack: L6_PACK,
  },
  {
    key: 'flywire-1pct',
    title: 'FlyWire whole brain, 1%',
    circuitId: '91c09a0b-d244-43dd-81a2-ff09a63a9002',
    workspace: SHARED_RESULTS_AND_TESTS,
    viewerDefaults: { ...HOME_VIEWER, colorByProperty: { flywire_brain: 'cell_class' } },
    // Its morphologies reach past the somas it is framed on.
    frameZoom: 0.85,
    art: '/images/start/examples/flywire-1pct.jpg',
    repoPack: FLY_PACK,
  },
  {
    // Public, and with no morphology pack: its somas.
    key: 'male-cns',
    title: 'Male CNS Brian2 model',
    circuitId: '17ebb332-480b-46e3-9d70-2bc88c836c81',
    viewerDefaults: HOME_VIEWER,
    // Long from brain to nerve cord: room for it as it turns.
    frameZoom: 0.7,
    art: '/images/start/examples/male-cns.jpg',
  },
];

/** Studio's shading, the occlusion on, turning, with no scale bar: the white canvas is the stage's. */
export const HOME_MESH: Partial<EmViewerSettings> = {
  look: 'studio',
  ao: true,
  beforeLook: null,
  spin: true,
  scalebar: false,
};

export const MESH_EXAMPLES: Array<{ key: string } & IMeshExample> = [
  {
    // The largest H01 mesh: a pyramidal cell with a long apical dendrite. H01's meshes carry no layer.
    key: 'human-pyramidal',
    title: 'Human pyramidal cell',
    meshId: '98a8c955-6790-49da-8ab4-5e5ed1960ed1',
    source: 'H01, human temporal cortex · EM reconstruction',
    viewerDefaults: { ...HOME_MESH, color: 'coral' },
    art: '/images/start/examples/human-pyramidal.jpg',
  },
  {
    key: 'microns',
    title: 'MICrONS pyramidal cell',
    meshId: '2a9381be-809b-4d11-b7b8-1a3e49fa9f7b',
    source: 'MICrONS, mouse visual cortex · EM reconstruction',
    viewerDefaults: { ...HOME_MESH, color: 'teal' },
    art: '/images/start/examples/microns.jpg',
  },
];

/** The project home's video shown until something else is picked. */
export const FEATURED_KEY = 'featured';

/** The type above a card's title, as the design labels its examples. */
export function itemTypeLabel(item: TStartItem): string {
  if (item.kind === 'circuit' || item.kind === 'mesh') return 'Data';
  if (item.kind === 'animation') return item.section === 'Workflows' ? 'Workflow' : item.section;
  return 'Tutorials';
}

/**
 * The row in order: the featured video, then the examples by type as the design
 * groups them, the circuits ahead of the Data, Workflows and Notebooks animations.
 */
export function buildStartItems({
  featured,
  cards,
}: {
  featured: TTutorial | undefined;
  cards: TProjectHomeGetStartedCard[];
}): TStartItem[] {
  const animations = cards.flatMap((card): TStartItem[] =>
    card.thumbnailType === 'video' && card.video
      ? [
          {
            kind: 'animation',
            key: card.link.replace(/^\//, '') || card._key,
            section: card.title,
            title: card.label,
            description: card.description,
            video: card.video,
            href: card.link,
          },
        ]
      : []
  );

  return [
    ...(featured
      ? [
          {
            kind: 'tutorial' as const,
            key: FEATURED_KEY,
            title: featured.title,
            video: featured.url,
            poster: '/images/start/featured.png',
          },
        ]
      : []),
    ...CIRCUIT_EXAMPLES.map((example) => ({ kind: 'circuit' as const, ...example })),
    ...MESH_EXAMPLES.map((example) => ({ kind: 'mesh' as const, ...example })),
    ...animations,
  ];
}
