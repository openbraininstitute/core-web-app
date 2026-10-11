import { notFound } from 'next/navigation';

import { tryCatch } from '@/api/utils';
import { config } from '@/config';
import { getAllFlags, learnFlag } from '@/features/feature-flags';
import { LEARN_COURSES, learnPagePath } from '@/features/learn/catalogue';
import { LearnPage } from '@/features/learn/ui/learn-page';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity/client';
import { type TTutorial, TutorialQuery } from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';

import type { FeatureFlags } from '@/features/feature-flags';

export default async function Page({
  params,
}: {
  params: Promise<{ virtualLabId: string; projectId: string }>;
}) {
  const { virtualLabId, projectId } = await params;
  const flags = await getAllFlags();
  if (!flags[learnFlag.key]) notFound();

  const shown = LEARN_COURSES.filter((course) => flags[course.flag as keyof FeatureFlags]);
  // the home page's tutorials, fetched the same way and under the same key, so they are shared
  const { data: tutorials } = await tryCatch(
    getQueryClient().fetchQuery({
      queryKey: keyBuilderExternal.discoverTutorialsList(),
      queryFn: () => getClient().fetch<Array<TTutorial>>(TutorialQuery),
    })
  );
  return (
    <LearnPage
      courseIds={shown.map((course) => course.id)}
      learnPath={learnPagePath(config.ROOT_ROUTE, virtualLabId, projectId)}
      tutorials={tutorials ?? []}
    />
  );
}
