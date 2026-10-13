import { notFound } from 'next/navigation';

import { tryCatch } from '@/api/utils';
import { config } from '@/config';
import { getAllFlags, learnFlag } from '@/features/feature-flags';
import { LEARN_COURSES, learnPagePath } from '@/features/learn/catalogue';
import {
  conferences,
  transmitterArticles,
  wwnRecordings,
  wwnUpcoming,
} from '@/features/learn/feeds';
import { LearnPage } from '@/features/learn/ui/learn-page';
import { obiOneWorkflows } from '@/features/learn/workflows';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity/client';
import { type TTutorial, TutorialQuery } from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';

export default async function Page({
  params,
}: {
  params: Promise<{ virtualLabId: string; projectId: string }>;
}) {
  const { virtualLabId, projectId } = await params;
  const flags = await getAllFlags();
  if (!flags[learnFlag.key]) notFound();

  // the home page's tutorials, fetched the same way and under the same key, so they are shared
  // and the outside sections', each cached for an hour, and empty if its source cannot be read
  const [{ data: tutorials }, recordings, upcoming, meetings, articles, workflows] =
    await Promise.all([
      tryCatch(
        getQueryClient().fetchQuery({
          queryKey: keyBuilderExternal.discoverTutorialsList(),
          queryFn: () => getClient().fetch<Array<TTutorial>>(TutorialQuery),
        })
      ),
      wwnRecordings(),
      wwnUpcoming(),
      conferences(),
      transmitterArticles(),
      obiOneWorkflows(),
    ]);
  return (
    <LearnPage
      // every course: the page leaves off those Learn's settings hide, as they change
      courseIds={LEARN_COURSES.map((course) => course.id)}
      learnPath={learnPagePath(config.ROOT_ROUTE, virtualLabId, projectId)}
      tutorials={tutorials ?? []}
      lectures={{ recorded: recordings, upcoming }}
      conferences={meetings}
      articles={articles}
      workflows={workflows}
    />
  );
}
