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

export const memodelBuildViaLaunchSystemFlag = defineFlag<boolean>({
  key: 'memodel-build-via-launch-system',
  defaultValue: false,
  values: [true, false],
  description: 'Launch single neuron (ME-model) builds via the launch system',
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

/** Learn: its tab in the project's top menu, its page of courses and the courses themselves. Off
 * unless switched on. */
export const learnFlag = defineFlag<boolean>({
  key: 'learn',
  defaultValue: false,
  values: [true, false],
  description: 'Learn: free courses, each a deck of slides',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/** The AI assistant opened from a round "AI" button in the top menu, rather than its side rail. */
export const aiButtonFlag = defineFlag<boolean>({
  key: 'ai-button',
  defaultValue: false,
  values: [true, false],
  description: 'AI assistant: a round "AI" button in the top menu instead of the side rail',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/** The project's top bar drawn in the style of the Learn courses' bar. */
export const courseToolbarFlag = defineFlag<boolean>({
  key: 'course-toolbar',
  defaultValue: false,
  values: [true, false],
  description: "Top bar drawn in the style of the Learn courses' bar",
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/** The top menu's links, all but the active one, on the page's grey rather than white. */
export const greyMenuPillsFlag = defineFlag<boolean>({
  key: 'grey-menu-pills',
  defaultValue: false,
  values: [true, false],
  description: "Top menu: links on the page's grey instead of white",
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/** Help hidden altogether: no Help button in the top menu, and no Help page. */
export const hideHelpFlag = defineFlag<boolean>({
  key: 'hide-help',
  defaultValue: false,
  values: [true, false],
  description: 'Help hidden altogether: no Help button and no Help page',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const flags = [
  aiPanelStateFlag,
  extractionActivityFlag,
  brainRegionSimulationFlag,
  extracellularRecordingArrayBuildFlag,
  smallScalesViaLaunchSystemFlag,
  memodelBuildViaLaunchSystemFlag,
  electrodeOverlaysFlag,
  morphologyDebugFlag,
  emMeshDebugFlag,
  learnFlag,
  aiButtonFlag,
  courseToolbarFlag,
  greyMenuPillsFlag,
  hideHelpFlag,
] as const;

export type FlagKey = (typeof flags)[number]['key'];

export const hasVisibleFlags = flags.some((flag) =>
  typeof flag.visible === 'boolean' ? flag.visible : flag.visible?.()
);

export type FeatureFlags = {
  [K in (typeof flags)[number] as K['key']]: K['defaultValue'];
};
