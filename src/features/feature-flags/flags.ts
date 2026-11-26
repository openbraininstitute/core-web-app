import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { PanelState } from '@/ui/segments/ai/types';

import { defineFlag, type TDeploymentEnv } from './define-flag';

export const aiPanelStateFlag = defineFlag<PanelState>({
  key: 'aiPanelState',
  defaultValue: PanelState.Collapsed,
  values: Object.values(PanelState),
  description: 'State of the AI panel',
  visible: false,
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

/** Interactive electrode overlays in circuit preview (independent of the build workflow). */
export const electrodeOverlaysFlag = defineFlag<boolean>({
  key: 'electrode-overlays',
  defaultValue: false,
  values: [true, false],
  description: 'Interactive electrode overlays in circuit preview',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/** The 3D viewers' Debug menus, fetched only with this on, and the circuit viewer's diagnostics in the console. */
export const debugFlag = defineFlag<boolean>({
  key: 'debug',
  defaultValue: false,
  values: [true, false],
  description: 'Debug menus in the morphology, EM cell mesh and circuit viewers',
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

/** E-model validation: the Validate workflow tab and its results under Data > Simulations. */
export const emodelValidationFlag = defineFlag<boolean>({
  key: 'emodel-validation',
  defaultValue: false,
  values: [true, false],
  description: 'E-model validation workflow and results',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

const LOGBOOK_ENVIRONMENTS: readonly TDeploymentEnv[] = ['local', 'staging'];

export const logbookFlag = defineFlag<boolean>({
  key: 'logbook',
  defaultValue: false,
  values: [true, false],
  description: 'Logbook: research logs, in the top menu after Reports',
  environments: LOGBOOK_ENVIRONMENTS,
  visible: () => LOGBOOK_ENVIRONMENTS.includes(config.DEPLOYMENT_ENV),
});

export const flags = [
  aiPanelStateFlag,
  brainRegionSimulationFlag,
  extracellularRecordingArrayBuildFlag,
  electrodeOverlaysFlag,
  debugFlag,
  projectScopeIconFlag,
  courseToolbarFlag,
  greyMenuPillsFlag,
  hideHelpFlag,
  emodelValidationFlag,
  logbookFlag,
] as const;

export type FlagKey = (typeof flags)[number]['key'];

export const hasVisibleFlags = flags.some((flag) =>
  typeof flag.visible === 'boolean' ? flag.visible : flag.visible?.()
);

export type FeatureFlags = {
  [K in (typeof flags)[number] as K['key']]: K['defaultValue'];
};
