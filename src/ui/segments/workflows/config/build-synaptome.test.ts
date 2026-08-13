import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { SchemaNameDict } from '@/features/scan-config/types';
import { buildSynaptomeWorkflow } from '@/features/scan-config/workflow/definitions/build-synaptome';

import { BuildWorkflows } from './activities/build';
import {
  buildGeneratedApiUrl,
  resolveScanConfigFromIdType,
  ScanConfigFromIdType,
} from './scan-config-binding';
import { findScanConfigRegistryByDefinition } from './scan-config-registry';

const descriptor = BuildWorkflows.find(
  (workflow) => workflow.targetType === ExtendedEntitiesTypeDict.BuildSynaptomeCampaign
);

describe('build synaptome workflow registration', () => {
  it('is registered under the build activity', () => {
    expect(descriptor).toBeDefined();
    expect(descriptor?.sourceType).toBe(ExtendedEntitiesTypeDict.Memodel);
    expect(descriptor?.disabled).toBe(false);
  });

  it('binds the obi-one MEModelSynapticModelPlacementScanConfig schema and generate endpoint', () => {
    const registry = findScanConfigRegistryByDefinition(buildSynaptomeWorkflow);

    expect(registry?.schemaName).toBe(SchemaNameDict.BuildSynaptomeScanConfig);
    expect(buildGeneratedApiUrl(registry?.configureBinding.generatedApiPath ?? '')).toContain(
      '/generated/me-model-synaptic-model-placement-scan-config-generate-grid'
    );
  });

  it('writes the browsed ME-model into initialize as an MEModelFromID', () => {
    const registry = findScanConfigRegistryByDefinition(buildSynaptomeWorkflow);
    // biome-ignore lint/style/noNonNullAssertion: asserted by the previous expectations
    const binding = registry!.configureBinding;

    expect(resolveScanConfigFromIdType(binding, ExtendedEntitiesTypeDict.Memodel)).toBe(
      ScanConfigFromIdType.MEModelFromID
    );
  });
});
