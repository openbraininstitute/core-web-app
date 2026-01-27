import { notFound } from 'next/navigation';
import singleShowcaseQuery from '@/app/api/sanity/query';
import { fetchSanity } from '@/services/sanity';
import type { ServerSideComponentProp } from '@/types/common';
import ArtifactsSection from '@/ui/segments/reports/obi-showcases/artifacts';
import DescriptionSection from '@/ui/segments/reports/obi-showcases/description';
import NotebooksSection from '@/ui/segments/reports/obi-showcases/notebooks';
import { SanityShowcaseSchema } from '@/ui/segments/reports/obi-showcases/types';

export default async function OBIShowcasePage({
  params: promisedParams,
  searchParams: promisedSearchParams,
}: ServerSideComponentProp<
  { virtualLabId: string; projectId: string; slug: string },
  { section?: string }
>) {
  const params = await promisedParams;
  const searchParams = await promisedSearchParams;
  const { slug } = params;
  const section = searchParams.section ?? 'description';

  const rawData = await fetchSanity(singleShowcaseQuery(slug), (data: unknown) => data !== null);

  if (!rawData) {
    notFound();
  }

  const validationResult = SanityShowcaseSchema.safeParse(rawData);

  let project;
  if (!validationResult.success) {
    project = rawData as any;
  } else {
    project = validationResult.data;
  }

  let activeSectionContent;
  switch (section) {
    case 'description':
      activeSectionContent = <DescriptionSection content={project} />;
      break;
    case 'artifacts':
      activeSectionContent = <ArtifactsSection content={project} />;
      break;
    case 'notebooks':
      activeSectionContent = <NotebooksSection content={project} />;
      break;
    default:
      activeSectionContent = <DescriptionSection content={project} />;
      break;
  }

  return <div className="space-y-8">{activeSectionContent}</div>;
}
