import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { NotAllowedResultsActionEntityTypes } from '@/ui/segments/workflows/elements/workflow-activity';

describe('workflow activity "View results" action', () => {
  it.each([
    // task campaigns registering one result per config, with no campaign-level result entity
    ExtendedEntitiesTypeDict.EFeatureExtractionCampaign,
    ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
    ExtendedEntitiesTypeDict.SkeletonizationCampaign,
  ])('is hidden for %s', (entityType) => {
    expect(NotAllowedResultsActionEntityTypes).toContain(entityType);
  });

  it('stays available for the campaigns that do resolve to a result entity', () => {
    expect(NotAllowedResultsActionEntityTypes).not.toContain(
      ExtendedEntitiesTypeDict.IonChannelModelingCampaign
    );
  });
});
