import { describe, expect, it } from 'vitest';

import {
  CircuitDerivationColumnExpand,
  DerivationExpandDirection,
  DerivationTypeDictionary,
  derivationExpand,
  getCircuitDerivationColumnLabels,
} from '@/api/entitycore/types/entities/derivation';

describe('getCircuitDerivationColumnLabels', () => {
  it('maps a single circuit derivation type to its short label', () => {
    expect(
      getCircuitDerivationColumnLabels([
        { derivation_type: DerivationTypeDictionary.CircuitExtraction },
      ])
    ).toEqual(['Extracted']);
  });

  it('ignores non-circuit derivation types, keeping only the circuit ones', () => {
    expect(
      getCircuitDerivationColumnLabels([
        { derivation_type: DerivationTypeDictionary.CircuitExtraction },
        { derivation_type: DerivationTypeDictionary.EmodelCircuit },
        { derivation_type: DerivationTypeDictionary.Unspecified },
      ])
    ).toEqual(['Extracted']);
  });

  it('lists multiple circuit derivation types', () => {
    expect(
      getCircuitDerivationColumnLabels([
        { derivation_type: DerivationTypeDictionary.CircuitExtraction },
        { derivation_type: DerivationTypeDictionary.CircuitRewiring },
      ])
    ).toEqual(['Extracted', 'Rewired']);
  });

  it('de-duplicates repeated derivation types', () => {
    expect(
      getCircuitDerivationColumnLabels([
        { derivation_type: DerivationTypeDictionary.CircuitCustomization },
        { derivation_type: DerivationTypeDictionary.CircuitCustomization },
      ])
    ).toEqual(['Customized']);
  });

  it('returns an empty list when only non-circuit derivation types are present', () => {
    expect(
      getCircuitDerivationColumnLabels([
        { derivation_type: DerivationTypeDictionary.EmodelCircuit },
      ])
    ).toEqual([]);
  });

  it('returns an empty list for no derivations', () => {
    expect(getCircuitDerivationColumnLabels([])).toEqual([]);
  });
});

describe('derivationExpand', () => {
  it('returns the bare direction (all types) when no types are given', () => {
    expect(derivationExpand(DerivationExpandDirection.UsedBy)).toEqual(['used_by_derivations']);
  });

  it('returns one de-duplicated typed value per derivation type', () => {
    expect(
      derivationExpand(DerivationExpandDirection.GeneratedFrom, [
        DerivationTypeDictionary.CircuitExtraction,
        DerivationTypeDictionary.CircuitRewiring,
        DerivationTypeDictionary.CircuitExtraction,
      ])
    ).toEqual([
      'generated_from_derivations:circuit_extraction',
      'generated_from_derivations:circuit_rewiring',
    ]);
  });

  it('expands nothing for an empty type list', () => {
    expect(derivationExpand(DerivationExpandDirection.GeneratedFrom, [])).toEqual([]);
  });
});

describe('CircuitDerivationColumnExpand', () => {
  it('requests exactly the derivation types the column labels', () => {
    expect([...CircuitDerivationColumnExpand].sort()).toEqual([
      'generated_from_derivations:circuit_customization',
      'generated_from_derivations:circuit_extraction',
      'generated_from_derivations:circuit_rewiring',
    ]);
  });
});
