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

export const microcircuitFlag = defineFlag<boolean>({
  key: 'microcircuit',
  defaultValue: false,
  values: [true, false],
  description: 'Enable microcircuit (simulations)',
  visible: () => ['local', 'preview'].includes(config.DEPLOYMENT_ENV),
});

export const extractionActivityFlag = defineFlag<boolean>({
  key: 'extraction-activity',
  defaultValue: false,
  values: [true, false],
  description: 'Enable extraction activity',
  visible: () => ['local', 'preview'].includes(config.DEPLOYMENT_ENV),
});

export const ionChannelSimulationActivityFlag = defineFlag<boolean>({
  key: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
  defaultValue: false,
  values: [true, false],
  description: 'Enable ion channel simulation',
  visible: () => ['local', 'preview'].includes(config.DEPLOYMENT_ENV),
});

export const flags = [
  aiPanelStateFlag,
  microcircuitFlag,
  extractionActivityFlag,
  ionChannelSimulationActivityFlag,
] as const;

export type FlagKey = (typeof flags)[number]['key'];

export const hasVisibleFlags = flags.some((flag) =>
  typeof flag.visible === 'boolean' ? flag.visible : flag.visible?.()
);

export type FeatureFlags = {
  [K in (typeof flags)[number] as K['key']]: K['defaultValue'];
};
