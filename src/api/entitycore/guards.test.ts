import { describe, expect, it } from 'vitest';

import {
  hasAssets,
  isElectricalCellRecording,
  isEmodel,
  isExperimentalBoutonDensity,
  isExperimentalNeuronDensity,
  isExperimentalSynapsesPerConnection,
  isMemodel,
  isReconstructionMorphology,
  isSingleNeuronSynaptome,
} from './guards';
import { EntityTypeDict } from './types/entity-type';

import type { EntityCoreObjectTypes } from './types';

function entityOfType(type: string): EntityCoreObjectTypes {
  return { type } as unknown as EntityCoreObjectTypes;
}

describe('guards', () => {
  describe('hasAssets()', () => {
    it('returns true when assets is an empty array', () => {
      expect(hasAssets({ assets: [] } as unknown as EntityCoreObjectTypes)).toBe(true);
    });

    it('returns true when assets is null', () => {
      expect(hasAssets({ assets: null } as unknown as EntityCoreObjectTypes)).toBe(true);
    });

    it('returns false for undefined', () => {
      expect(hasAssets(undefined)).toBe(false);
    });

    it('returns false for null', () => {
      expect(hasAssets(null)).toBe(false);
    });

    it('returns false when no assets key is present', () => {
      expect(hasAssets({} as unknown as EntityCoreObjectTypes)).toBe(false);
    });

    it('returns false when assets is a non-array, non-null value', () => {
      expect(hasAssets({ assets: 'string' } as unknown as EntityCoreObjectTypes)).toBe(false);
    });
  });

  describe('isReconstructionMorphology()', () => {
    it('returns true when type matches CellMorphology', () => {
      expect(isReconstructionMorphology(entityOfType(EntityTypeDict.CellMorphology))).toBe(true);
    });

    it('returns false for a different type', () => {
      expect(isReconstructionMorphology(entityOfType(EntityTypeDict.Emodel))).toBe(false);
    });
  });

  describe('isElectricalCellRecording()', () => {
    it('returns true when type matches ElectricalCellRecording', () => {
      expect(isElectricalCellRecording(entityOfType(EntityTypeDict.ElectricalCellRecording))).toBe(
        true
      );
    });

    it('returns false for a different type', () => {
      expect(isElectricalCellRecording(entityOfType(EntityTypeDict.CellMorphology))).toBe(false);
    });
  });

  describe('isExperimentalNeuronDensity()', () => {
    it('returns true when type matches ExperimentalNeuronDensity', () => {
      expect(
        isExperimentalNeuronDensity(entityOfType(EntityTypeDict.ExperimentalNeuronDensity))
      ).toBe(true);
    });

    it('returns false for a different type', () => {
      expect(isExperimentalNeuronDensity(entityOfType(EntityTypeDict.Emodel))).toBe(false);
    });
  });

  describe('isExperimentalBoutonDensity()', () => {
    it('returns true when type matches ExperimentalBoutonDensity', () => {
      expect(
        isExperimentalBoutonDensity(entityOfType(EntityTypeDict.ExperimentalBoutonDensity))
      ).toBe(true);
    });

    it('returns false for a different type', () => {
      expect(isExperimentalBoutonDensity(entityOfType(EntityTypeDict.Emodel))).toBe(false);
    });
  });

  describe('isExperimentalSynapsesPerConnection()', () => {
    it('returns true when type matches ExperimentalSynapsesPerConnection', () => {
      expect(
        isExperimentalSynapsesPerConnection(
          entityOfType(EntityTypeDict.ExperimentalSynapsesPerConnection)
        )
      ).toBe(true);
    });

    it('returns false for a different type', () => {
      expect(isExperimentalSynapsesPerConnection(entityOfType(EntityTypeDict.Emodel))).toBe(false);
    });
  });

  describe('isSingleNeuronSynaptome()', () => {
    it('returns true when type matches SingleNeuronSynaptome', () => {
      expect(isSingleNeuronSynaptome(entityOfType(EntityTypeDict.SingleNeuronSynaptome))).toBe(
        true
      );
    });

    it('returns false for a different type', () => {
      expect(isSingleNeuronSynaptome(entityOfType(EntityTypeDict.Emodel))).toBe(false);
    });

    it('returns false for null', () => {
      expect(isSingleNeuronSynaptome(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isSingleNeuronSynaptome(undefined)).toBe(false);
    });
  });

  describe('isMemodel()', () => {
    it('returns true when type matches Memodel', () => {
      expect(isMemodel(entityOfType(EntityTypeDict.Memodel))).toBe(true);
    });

    it('returns false for a different type', () => {
      expect(isMemodel(entityOfType(EntityTypeDict.Emodel))).toBe(false);
    });
  });

  describe('isEmodel()', () => {
    it('returns true when type matches Emodel', () => {
      expect(isEmodel(entityOfType(EntityTypeDict.Emodel))).toBe(true);
    });

    it('returns false for a different type', () => {
      expect(isEmodel(entityOfType(EntityTypeDict.Memodel))).toBe(false);
    });
  });
});
