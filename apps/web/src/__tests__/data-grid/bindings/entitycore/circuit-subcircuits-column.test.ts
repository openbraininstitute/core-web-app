import { describe, expect, it } from 'vitest';

import { WorkspaceSection } from '@/constants';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { circuitSchema } from '@/features/data-grid/bindings/entitycore/schemas/circuit';
import { resolveColumns } from '@/features/data-grid/core';
import {
  CIRCUIT_VIEW_FACTOR,
  CircuitRepresentationView,
} from '@/ui/segments/explore/circuit/helpers';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IGridContext } from '@/features/data-grid/core';

/**
 * The Subcircuits column must resolve away outside the Data → Circuit hierarchy listing,
 * while staying in `circuitSchema.columns`, which the nested grid and the detail view's
 * `RELATED_CIRCUIT_COLUMNS` render from.
 */
function context(over: Partial<IGridContext> = {}): IGridContext {
  return { dataType: 'circuit', section: WorkspaceSection.Data, scope: 'public', ...over };
}

const hierarchyFactors = { [CIRCUIT_VIEW_FACTOR]: CircuitRepresentationView.Hierarchy };
const flatFactors = { [CIRCUIT_VIEW_FACTOR]: CircuitRepresentationView.Flat };

function resolvedIds(ctx: IGridContext): string[] {
  return resolveColumns<ICircuit>(circuitSchema, ctx).map((c) => c.id);
}

describe('circuit — Subcircuits column availability', () => {
  it('is present on the Data listing in HIERARCHY view', () => {
    expect(resolvedIds(context({ factors: hierarchyFactors }))).toContain(
      EntityCoreFields.CircuitSubCircuit
    );
  });

  it('is absent on the Data listing in FLAT view (no tree, no expander)', () => {
    expect(resolvedIds(context({ factors: flatFactors }))).not.toContain(
      EntityCoreFields.CircuitSubCircuit
    );
  });

  it('is absent on a workflow surface even though that surface has no view factor', () => {
    expect(resolvedIds(context({ section: WorkspaceSection.ExtractWorkflow }))).not.toContain(
      EntityCoreFields.CircuitSubCircuit
    );
  });

  it('is absent on a workflow surface that somehow carries a hierarchy factor', () => {
    expect(
      resolvedIds(context({ section: WorkspaceSection.ExtractWorkflow, factors: hierarchyFactors }))
    ).not.toContain(EntityCoreFields.CircuitSubCircuit);
  });

  it('is absent on a picker mount (Data section, no plugin ⇒ no view factor)', () => {
    expect(resolvedIds(context())).not.toContain(EntityCoreFields.CircuitSubCircuit);
  });

  it('leaves every OTHER circuit column untouched by the gate', () => {
    const hierarchy = resolvedIds(context({ factors: hierarchyFactors }));
    const picker = resolvedIds(context());
    expect(hierarchy.filter((id) => id !== EntityCoreFields.CircuitSubCircuit)).toEqual(picker);
  });

  it('stays in the raw schema columns, so the nested recursive grid keeps the expander host', () => {
    // neither consumer runs `resolveColumns`, so the contextual gate must not touch them
    expect(circuitSchema.columns.map((c) => c.id)).toContain(EntityCoreFields.CircuitSubCircuit);
  });
});
