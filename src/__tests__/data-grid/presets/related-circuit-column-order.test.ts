import { describe, expect, it } from 'vitest';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { circuitSchema } from '@/features/data-grid/bindings/entitycore/schemas/circuit';
import { RELATED_CIRCUIT_COLUMNS } from '@/ui/segments/explore/circuit/elements/related-circuits/columns';

/**
 * The related-circuits tabs ARE the subcircuit view, so the Subcircuits count —
 * and the expander it hosts — leads the data columns. The Data → Circuit listing
 * keeps the schema's own `Name, Subcircuits, …` order.
 */
describe('RELATED_CIRCUIT_COLUMNS ordering', () => {
  it('puts Subcircuits second, right after the download action', () => {
    const ids = RELATED_CIRCUIT_COLUMNS.map((c) => c.id);
    expect(ids[0]).toBe('__download');
    expect(ids[1]).toBe(EntityCoreFields.CircuitSubCircuit);
    expect(ids[2]).toBe(EntityCoreFields.Name);
  });

  it('keeps every schema column exactly once', () => {
    const schemaIds = circuitSchema.columns.map((c) => c.id).sort();
    const relatedIds = RELATED_CIRCUIT_COLUMNS.filter((c) => c.id !== '__download')
      .map((c) => c.id)
      .sort();
    expect(relatedIds).toEqual(schemaIds);
  });

  it('leaves the schema itself untouched (Data listing keeps Name first)', () => {
    expect(circuitSchema.columns[0]?.id).toBe(EntityCoreFields.Name);
    expect(circuitSchema.columns[1]?.id).toBe(EntityCoreFields.CircuitSubCircuit);
  });
});
