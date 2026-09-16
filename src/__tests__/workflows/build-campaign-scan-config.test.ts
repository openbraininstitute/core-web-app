import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { findScanConfigRegistryByTargetType } from '@/ui/segments/workflows/config/scan-config-registry';

describe('build campaign overview', () => {
  it.each([
    ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
    ExtendedEntitiesTypeDict.CircuitSynapticPhysiologyCampaign,
  ])('resolves a scan config for %s so the overview renders the editor', (targetType) => {
    expect(findScanConfigRegistryByTargetType(targetType)).not.toBeNull();
  });
});
