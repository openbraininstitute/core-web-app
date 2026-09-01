import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';

export default async function Page() {
  return (
    <BrowseEntityScope
      section={WorkspaceSection.Data}
      dataType={ExtendedEntitiesTypeDict.Circuit}
    />
  );
}
