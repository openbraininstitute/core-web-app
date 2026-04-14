import { EntityCoreConfiguration } from '@/entity-configuration/domain';

import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export function buildContributionArtifactOptions(): Array<{
  label: string;
  value: TExtendedEntitiesTypeDict;
  description?: string;
  icon?: ReactNode;
  enabled: boolean;
}> {
  return Object.entries(EntityCoreConfiguration)
    .filter(([, value]) => Boolean(value.isContributable))
    .map(([, value]) => ({
      label: value.title,
      value: value.extendedType,
      enabled: Boolean(value.isMultipleContributeSupport || value.isSingleContributeSupport),
      description: value.description,
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
