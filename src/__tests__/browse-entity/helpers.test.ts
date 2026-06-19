import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { extractPartsFromDataKey, makeDataKey } from '@/ui/segments/data-table/elements/helpers';

describe('data table dataKey helpers', () => {
  it('roundtrips makeDataKey and extractPartsFromDataKey', () => {
    const parts = {
      virtualLabId: 'virtual-lab',
      projectId: 'project',
      section: WorkspaceSection.Data,
      dataType: ExtendedEntitiesTypeDict.IonChannelModel,
      scope: WorkspaceScope.Public,
      id: 'listing-id',
      extra: 'workflow-extra',
    };

    const { dataKey } = makeDataKey(parts);

    expect(dataKey).toBe(
      'virtual-lab/project/data/ion_channel_model/public/listing-id/workflow-extra'
    );
    expect(extractPartsFromDataKey(dataKey)).toEqual(parts);
  });

  it('leaves omitted trailing dataKey segments undefined', () => {
    const { dataKey } = makeDataKey({
      virtualLabId: 'virtual-lab',
      projectId: 'project',
      section: WorkspaceSection.Data,
      dataType: ExtendedEntitiesTypeDict.IonChannelModel,
      scope: WorkspaceScope.Public,
    });

    expect(extractPartsFromDataKey(dataKey)).toEqual({
      virtualLabId: 'virtual-lab',
      projectId: 'project',
      section: WorkspaceSection.Data,
      dataType: ExtendedEntitiesTypeDict.IonChannelModel,
      scope: WorkspaceScope.Public,
      id: undefined,
      extra: undefined,
    });
  });

  it('misaligns parsed segments when projectId is omitted from the dataKey', () => {
    const { dataKey } = makeDataKey({
      virtualLabId: 'virtual-lab',
      section: WorkspaceSection.Data,
      dataType: ExtendedEntitiesTypeDict.IonChannelModel,
      scope: WorkspaceScope.Public,
    });

    expect(extractPartsFromDataKey(dataKey)).toEqual({
      virtualLabId: 'virtual-lab',
      projectId: WorkspaceSection.Data,
      section: ExtendedEntitiesTypeDict.IonChannelModel,
      dataType: WorkspaceScope.Public,
      scope: undefined,
      id: undefined,
      extra: undefined,
    });
  });
});
