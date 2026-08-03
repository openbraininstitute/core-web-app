import { describe, expect, it } from 'vitest';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { circuitSchema } from '@/features/data-grid/bindings/entitycore/schemas/circuit';
import { RELATED_CIRCUIT_COLUMNS } from '@/ui/segments/explore/circuit/elements/related-circuits/columns';

/**
 * These tabs render the circuit schema's own column order (`Name, Subcircuits, …`)
 * behind a leading download action — no reordering, so the count and the expander
 * it hosts sit directly after Name, exactly as on the Data → Circuit listing.
 */
describe('RELATED_CIRCUIT_COLUMNS ordering', () => {
  it('puts Subcircuits directly after Name', () => {
    const ids = RELATED_CIRCUIT_COLUMNS.map((c) => c.id);
    expect(ids[0]).toBe('__download');
    expect(ids[1]).toBe(EntityCoreFields.Name);
    expect(ids[2]).toBe(EntityCoreFields.CircuitSubCircuit);
  });

  it('keeps every schema column exactly once', () => {
    const schemaIds = circuitSchema.columns.map((c) => c.id).sort();
    const relatedIds = RELATED_CIRCUIT_COLUMNS.filter((c) => c.id !== '__download')
      .map((c) => c.id)
      .sort();
    expect(relatedIds).toEqual(schemaIds);
  });

  // Regression: the schema gates Subcircuits behind a contextual `available` rule.
  // InMemoryGrid resolves columns against its own generic context, so a surviving
  // gate drops the column from the controller's `columnOrder` — and an unordered id
  // sorts LAST, pushing Subcircuits past Experiment date on screen.
  it('carries no contextual availability gate', () => {
    for (const column of RELATED_CIRCUIT_COLUMNS) {
      expect(column.available).toBeUndefined();
    }
  });

  it('leaves the schema itself untouched (Data listing keeps Name first)', () => {
    expect(circuitSchema.columns[0]?.id).toBe(EntityCoreFields.Name);
    expect(circuitSchema.columns[1]?.id).toBe(EntityCoreFields.CircuitSubCircuit);
  });
});
