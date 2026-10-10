import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DATA_LISTING_PROPS } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';

export default async function Page() {
  return <BrowseEntityScope {...DATA_LISTING_PROPS} dataType={ExtendedEntitiesTypeDict.Circuit} />;
}
