import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import { BrowseCircuit } from '@/ui/segments/explore/circuit';

export default async function Page() {
  return (
    <BrowseCircuit
      section={WorkspaceSection.Data}
      dataType={ExtendedEntitiesTypeDict.Circuit}
      mainTableProps={{
        selectionType: undefined,
      }}
    />
  );
}
