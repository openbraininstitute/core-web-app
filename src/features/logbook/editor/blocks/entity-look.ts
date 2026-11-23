import { isNotNil } from 'es-toolkit';

import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { entityConfigOf } from '@/features/logbook/api/entities';
import { entityLookOf, entityLooks } from '@/features/logbook/blocks/kinds';

import type { TEntityTypeGroup } from '@/entity-configuration/domain/group';
import type { ILook } from '@/features/logbook/types';

// Colours by Data category, for core types the logbook has no look of its own for.
export const groupLooks: Partial<Record<TEntityTypeGroup, Omit<ILook, 'label'>>> = {
  [EntityTypeGroup.Experimental]: { colour: '#0f766e', tint: '#e6f4f2' },
  [EntityTypeGroup.Models]: { colour: '#1677c9', tint: '#e8f3fc' },
  [EntityTypeGroup.Simulations]: { colour: '#9d174d', tint: '#fbe9f0' },
};

/** A card's label and colours: the logbook's own, else core's title and its category colour. */
export function lookOfType(type: string): ILook {
  if (Object.hasOwn(entityLooks, type)) return entityLookOf(type);
  const config = entityConfigOf(type);
  const group = isNotNil(config) ? groupLooks[config.group] : undefined;
  return isNotNil(config) && isNotNil(group)
    ? { label: config.title, ...group }
    : { ...entityLookOf(type), label: config?.title ?? entityLookOf(type).label };
}
