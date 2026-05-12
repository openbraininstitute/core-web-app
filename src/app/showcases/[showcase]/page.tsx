import { notFound } from 'next/navigation';

import singleShowcaseQuery from '@/app/api/sanity/query';
import ShowcaseDetailLayout from '@/ui/segments/landing/layout/showcase-detail';
import { fetchSanity } from '@/services/sanity';
import { SanityShowcaseSchema } from '@/ui/segments/reports/obi-showcases/types';

import ShowcaseDetailContent from './ShowcaseDetailContent';

import type { ServerSideComponentProp } from '@/types/common';
import type { SanityShowcaseType } from '@/ui/segments/reports/obi-showcases/types';

export const dynamic = 'force-dynamic';

export default async function ShowcaseDetailPage({
  params: promisedParams,
}: ServerSideComponentProp<{ showcase: string }, { section?: string }>) {
  const params = await promisedParams;
  const slug = decodeURIComponent(params.showcase);

  const rawData = await fetchSanity(
    singleShowcaseQuery(slug),
    (data: unknown): data is NonNullable<typeof data> => data !== null
  );

  if (!rawData) {
    notFound();
  }

  const validationResult = SanityShowcaseSchema.safeParse(rawData);

  let project: SanityShowcaseType;
  if (!validationResult.success) {
    project = rawData as SanityShowcaseType;
  } else {
    project = validationResult.data;
  }

  return (
    <ShowcaseDetailLayout>
      <ShowcaseDetailContent project={project} />
    </ShowcaseDetailLayout>
  );
}
