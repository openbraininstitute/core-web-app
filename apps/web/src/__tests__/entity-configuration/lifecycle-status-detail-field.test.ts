import { describe, expect, it } from 'vitest';

import { getFieldDefinition } from '@/entity-configuration/definitions';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  CommonSummaryViewFields,
  ViewsDefinitionRegistry,
  withLifecycleStatusLast,
} from '@/entity-configuration/definitions/view-defs';

import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';

describe('lifecycle status on the detail views', () => {
  it('is a known field with a title', () => {
    expect(getFieldDefinition(EntityCoreFields.LifecycleStatus)?.title).toBe('Lifecycle status');
  });

  it('lands last whatever the declared list is', () => {
    const declared: TypeSummaryProps[] = [
      { field: EntityCoreFields.Name },
      { field: EntityCoreFields.BrainRegion },
    ];
    expect(withLifecycleStatusLast(declared).at(-1)?.field).toBe(EntityCoreFields.LifecycleStatus);
    expect(withLifecycleStatusLast([]).map((f) => f.field)).toEqual([
      EntityCoreFields.LifecycleStatus,
    ]);
    expect(withLifecycleStatusLast(undefined).map((f) => f.field)).toEqual([
      EntityCoreFields.LifecycleStatus,
    ]);
  });

  it('does not move a definition that places the field itself', () => {
    const declared: TypeSummaryProps[] = [
      { field: EntityCoreFields.LifecycleStatus },
      { field: EntityCoreFields.Name },
    ];
    expect(withLifecycleStatusLast(declared).map((f) => f.field)).toEqual([
      EntityCoreFields.LifecycleStatus,
      EntityCoreFields.Name,
    ]);
  });

  it('reaches every registered entity, on both surfaces', () => {
    const entries = Object.values(ViewsDefinitionRegistry);
    expect(entries.length).toBeGreaterThan(0);
    for (const view of entries) {
      expect(withLifecycleStatusLast(view.miniDetailView).at(-1)?.field).toBe(
        EntityCoreFields.LifecycleStatus
      );
      expect(
        withLifecycleStatusLast([...CommonSummaryViewFields, ...(view.summaryViewFields ?? [])]).at(
          -1
        )?.field
      ).toBe(EntityCoreFields.LifecycleStatus);
    }
  });
});
