import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { PanelState } from '@/ui/segments/ai/types';

import { defineFlag } from './define-flag';

export const aiPanelStateFlag = defineFlag<PanelState>({
  key: 'aiPanelState',
  defaultValue: PanelState.Collapsed,
  values: Object.values(PanelState),
  description: 'State of the AI panel',
  visible: false,
});

export const extractionActivityFlag = defineFlag<boolean>({
  key: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
  defaultValue: false,
  values: [true, false],
  description: 'Full extraction workflow',
  visible: () => ['local', 'preview'].includes(config.DEPLOYMENT_ENV),
});

export const brainRegionSimulationFlag = defineFlag<boolean>({
  key: 'brain-region-simulation',
  defaultValue: false,
  values: [true, false],
  description: 'Brain region simulations',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const extracellularRecordingArrayBuildFlag = defineFlag<boolean>({
  key: ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign,
  defaultValue: false,
  values: [true, false],
  description: 'Extracellular recording array build',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const smallScalesViaLaunchSystemFlag = defineFlag<boolean>({
  key: 'small-scales-via-launch-system',
  defaultValue: false,
  values: [true, false],
  description:
    'Launch single neuron, synaptome, paired neurons and small microcircuit simulations via the launch system',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/** Interactive electrode overlays in circuit preview (independent of the build workflow). */
export const electrodeOverlaysFlag = defineFlag<boolean>({
  key: 'electrode-overlays',
  defaultValue: false,
  values: [true, false],
  description: 'Interactive electrode overlays in circuit preview',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/** The morphology viewer's Debug menu: the statistics of the file and the mesh, and the mesh exports. */
export const morphologyDebugFlag = defineFlag<boolean>({
  key: 'morphology-debug',
  defaultValue: false,
  values: [true, false],
  description: 'Morphology viewer debug menu (statistics and mesh export)',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/** The EM cell mesh viewer's Debug menu: the load's timings and memory, and how the mesh on show is chosen. */
export const emMeshDebugFlag = defineFlag<boolean>({
  key: 'em-mesh-debug',
  defaultValue: false,
  values: [true, false],
  description: 'EM cell mesh viewer debug menu (load timings, memory and mesh choice)',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/** The Data table's mark for a project's own records: two people, or one. */
export const projectScopeIconFlag = defineFlag<'two' | 'one'>({
  key: 'project-scope-icon',
  defaultValue: 'two',
  values: ['two', 'one'],
  labels: ['Two people', 'One person'],
  description: 'Project icon in the Data table',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const flags = [
  aiPanelStateFlag,
  extractionActivityFlag,
  brainRegionSimulationFlag,
  extracellularRecordingArrayBuildFlag,
  smallScalesViaLaunchSystemFlag,
  electrodeOverlaysFlag,
  morphologyDebugFlag,
  emMeshDebugFlag,
  projectScopeIconFlag,
] as const;

export type FlagKey = (typeof flags)[number]['key'];

export const hasVisibleFlags = flags.some((flag) =>
  typeof flag.visible === 'boolean' ? flag.visible : flag.visible?.()
);

export type FeatureFlags = {
  [K in (typeof flags)[number] as K['key']]: K['defaultValue'];
};
