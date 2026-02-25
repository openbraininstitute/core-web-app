import { flatMap, times } from 'es-toolkit/compat';

import { getClient } from '@/services/sanity/client';
import { DiscoverGrid } from '@/ui/segments/project/get-started/elements/discover-grid';
import { discoverQuery, type TDiscoverTutorials } from '@/ui/segments/project/get-started/query';

export async function DiscoverList() {
  const client = getClient();
  const videos = await client.fetch<TDiscoverTutorials>(discoverQuery);
  const tutorials = flatMap(times(20), () => videos.tutorialOrder);

  return <DiscoverGrid tutorials={tutorials} />;
}
