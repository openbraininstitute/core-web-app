import { EntityCoreConfiguration } from '@/entity-configuration/domain';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export function buildContributionArtifactOptions(): Array<{
  label: string;
  value: TExtendedEntitiesTypeDict;
}> {
  return Object.entries(EntityCoreConfiguration)
    .filter(([, p]) => p.isContributable ?? false)
    .map(([, value]) => ({
      label: value.title,
      value: value.extendedType,
    }));
}

export const ImportMode = {
  Single: 'single',
  Multiple: 'multiple',
} as const;

export type TImportMode = (typeof ImportMode)[keyof typeof ImportMode];

export const ImportLeftSideTab = {
  Type: 'type',
  Options: 'options',
} as const;

export type TImportLeftSideTab = (typeof ImportLeftSideTab)[keyof typeof ImportLeftSideTab];
