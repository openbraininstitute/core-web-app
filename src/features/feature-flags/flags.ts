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

export const efeatureExtractionActivityFlag = defineFlag<boolean>({
  key: ExtendedEntitiesTypeDict.EFeatureExtractionCampaign,
  defaultValue: false,
  values: [true, false],
  description: 'Intracellular e-feature extraction workflow',
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
  visible: () => ['local', 'preview'].includes(config.DEPLOYMENT_ENV),
});

/** Interactive electrode overlays in circuit preview (independent of the build workflow). */
export const electrodeOverlaysFlag = defineFlag<boolean>({
  key: 'electrode-overlays',
  defaultValue: false,
  values: [true, false],
  description: 'Interactive electrode overlays in circuit preview',
  visible: () => ['local', 'preview'].includes(config.DEPLOYMENT_ENV),
});

export const flags = [
  aiPanelStateFlag,
  extractionActivityFlag,
  efeatureExtractionActivityFlag,
  brainRegionSimulationFlag,
  extracellularRecordingArrayBuildFlag,
  electrodeOverlaysFlag,
] as const;

export type FlagKey = (typeof flags)[number]['key'];

export const hasVisibleFlags = flags.some((flag) =>
  typeof flag.visible === 'boolean' ? flag.visible : flag.visible?.()
);

export type FeatureFlags = {
  [K in (typeof flags)[number] as K['key']]: K['defaultValue'];
};
