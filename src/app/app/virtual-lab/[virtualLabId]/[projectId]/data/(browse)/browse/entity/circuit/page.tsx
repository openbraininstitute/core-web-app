import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DATA_PANEL_MAX_HEIGHT, DATA_SECTION_SCOPE, WorkspaceSection } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';

export default async function Page() {
  return (
    <BrowseEntityScope
      section={WorkspaceSection.Data}
      scope={DATA_SECTION_SCOPE}
      classNames={{ container: DATA_PANEL_MAX_HEIGHT, miniView: DATA_PANEL_MAX_HEIGHT }}
      dataType={ExtendedEntitiesTypeDict.Circuit}
      allowUpload
      bulkActionsInToolbar
      framed
    />
  );
}
