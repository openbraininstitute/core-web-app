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

import '@/styles/learn.css';

export default async function Page({
  params,
}: {
  params: Promise<{ virtualLabId: string; projectId: string }>;
}) {
  const { virtualLabId, projectId } = await params;
  const flags = await getAllFlags();
  if (!flags[learnFlag.key]) notFound();

  // the home page's tutorials, fetched the same way and under the same key, so they are shared
  const { data: tutorials } = await tryCatch(
    getQueryClient().fetchQuery({
      queryKey: keyBuilderExternal.discoverTutorialsList(),
      queryFn: () => getClient().fetch<Array<TTutorial>>(TutorialQuery),
    })
  );
  return (
    <LearnPage
      // every course: the page leaves off those Learn's settings hide, as they change
      courseIds={LEARN_COURSES.map((course) => course.id)}
      learnPath={learnPagePath(config.ROOT_ROUTE, virtualLabId, projectId)}
      tutorials={tutorials ?? []}
      // and the outside sections' and the workflows', not waited for: each streams in when its
      // source answers, cached for an hour, and empty if it cannot be read in time
      lectures={Promise.all([wwnRecordings(), wwnUpcoming()]).then(([recorded, upcoming]) => ({
        recorded,
        upcoming,
      }))}
      conferences={conferences()}
      articles={transmitterArticles()}
      workflows={obiOneWorkflows()}
    />
  );
}
