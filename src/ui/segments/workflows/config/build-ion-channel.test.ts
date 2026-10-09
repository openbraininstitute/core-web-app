import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityValues } from '@/ui/segments/workflows/config';

import { listWorkflows } from './helpers';

const targetTypes = (context: 'configure' | 'browse') =>
  listWorkflows({ activity: ActivityValues.Build, context }).map((w) => w.targetType);

describe('ion channel build workflow registration', () => {
  it('configures new builds as generic task-config campaigns', () => {
    expect(targetTypes('configure')).toContain(ExtendedEntitiesTypeDict.IonChannelBuildCampaign);
    expect(targetTypes('configure')).not.toContain(
      ExtendedEntitiesTypeDict.IonChannelModelingCampaign
    );
  });

  it('still lists the campaigns built before the scan-config editor among past runs', () => {
    expect(targetTypes('browse')).toEqual(
      expect.arrayContaining([
        ExtendedEntitiesTypeDict.IonChannelBuildCampaign,
        ExtendedEntitiesTypeDict.IonChannelModelingCampaign,
      ])
    );
  });
});
