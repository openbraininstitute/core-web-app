import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getConfigKeyForEntity } from '@/features/scan-config/helpers';
import { ScanConfigActivity, SchemaNameDict } from '@/features/scan-config/types';

describe('getConfigKeyForEntity', () => {
  describe('Build activity', () => {
    it('resolves EM synapse mapping by schemaName', () => {
      expect(
        getConfigKeyForEntity(
          ExtendedEntitiesTypeDict.Circuit,
          ScanConfigActivity.Build,
          undefined,
          SchemaNameDict.EMSynapseMappingScanConfig
        )
      ).toBe('em_synapse_mapping_config');
    });

    it('resolves synaptome building by schemaName', () => {
      expect(
        getConfigKeyForEntity(
          ExtendedEntitiesTypeDict.Memodel,
          ScanConfigActivity.Build,
          undefined,
          SchemaNameDict.BuildSynaptomeScanConfig
        )
      ).toBe('me_model_synaptic_model_placement_config');
    });

    it('resolves extracellular recording array by schemaName', () => {
      expect(
        getConfigKeyForEntity(
          ExtendedEntitiesTypeDict.Circuit,
          ScanConfigActivity.Build,
          undefined,
          SchemaNameDict.ExtracellularRecordingArrayScanConfig
        )
      ).toBe('create_extracellular_recording_array_config');
    });

    it('resolves circuit synaptic physiology by schemaName', () => {
      expect(
        getConfigKeyForEntity(
          ExtendedEntitiesTypeDict.Circuit,
          ScanConfigActivity.Build,
          undefined,
          SchemaNameDict.SynapseParameterizationScanConfig
        )
      ).toBe('synapse_parameterization_config');
    });

    it('disambiguates two Circuit-entityType Build workflows by schemaName alone', () => {
      // Extracellular recording array and circuit synaptic physiology both
      // operate on a Circuit entity — schemaName is the only discriminator.
      const sharedEntityType = ExtendedEntitiesTypeDict.Circuit;
      expect(
        getConfigKeyForEntity(
          sharedEntityType,
          ScanConfigActivity.Build,
          undefined,
          SchemaNameDict.ExtracellularRecordingArrayScanConfig
        )
      ).not.toBe(
        getConfigKeyForEntity(
          sharedEntityType,
          ScanConfigActivity.Build,
          undefined,
          SchemaNameDict.SynapseParameterizationScanConfig
        )
      );
    });

    it('returns null for a Build schema with no AI config key (e.g. the bespoke ion-channel fitting UI)', () => {
      expect(
        getConfigKeyForEntity(ExtendedEntitiesTypeDict.IonChannelModel, ScanConfigActivity.Build)
      ).toBeNull();
    });

    it('returns null when schemaName is omitted', () => {
      expect(
        getConfigKeyForEntity(ExtendedEntitiesTypeDict.Circuit, ScanConfigActivity.Build)
      ).toBeNull();
    });
  });

  describe('non-Build activities (unaffected by the Build branch)', () => {
    it('still resolves Process to skeletonization_config', () => {
      expect(
        getConfigKeyForEntity(ExtendedEntitiesTypeDict.Circuit, ScanConfigActivity.Process)
      ).toBe('skeletonization_config');
    });

    it('still resolves Optimize to emodel_optimization_config', () => {
      expect(
        getConfigKeyForEntity(ExtendedEntitiesTypeDict.Memodel, ScanConfigActivity.Optimize)
      ).toBe('emodel_optimization_config');
    });
  });
});
