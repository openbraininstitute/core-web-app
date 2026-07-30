import { describe, expect, it } from 'vitest';

import { CircuitRepresentationView } from '../helpers';
import { circuitListingRowClass } from './circuit-listing-grid';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

function circuit(id: string, extra: Partial<ICircuit> = {}): ICircuit {
  return { id, name: `circuit-${id}`, ...extra } as unknown as ICircuit;
}

describe('circuitListingRowClass', () => {
  it('highlights a filtered-in row regardless of view', () => {
    const row = circuit('a', { isFiltered: true } as Partial<ICircuit>);
    expect(circuitListingRowClass(row, CircuitRepresentationView.Flat)).toContain('filtered-in');
    expect(circuitListingRowClass(row, CircuitRepresentationView.Hierarchy)).toContain(
      'filtered-in'
    );
  });

  it('dims a non-filtered row in hierarchy view', () => {
    const row = circuit('a');
    const cls = circuitListingRowClass(row, CircuitRepresentationView.Hierarchy);
    expect(cls).toContain('filtered-out');
    expect(cls).toContain('text-neutral-4');
  });

  it('applies the default flat-view class when not filtered and not hierarchy', () => {
    const row = circuit('a');
    const cls = circuitListingRowClass(row, CircuitRepresentationView.Flat);
    expect(cls).not.toContain('filtered-out');
    expect(cls).toContain('text-primary-8');
  });

  it('treats an explicit isFiltered:false row as not filtered-in', () => {
    const row = circuit('a', { isFiltered: false } as Partial<ICircuit>);
    expect(circuitListingRowClass(row, CircuitRepresentationView.Flat)).not.toContain(
      'filtered-in'
    );
  });
});
