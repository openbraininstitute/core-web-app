import Link from 'next/link';

import { auth } from '@/auth';
import PaperListView from '@/components/papers/PaperListView';
import { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import retrievePapersList from '@/services/paper-ai/retrievePapersList';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';

export default async function PapersListing({
  params: promisedParams,
}: ServerSideComponentProp<WorkspaceContext, any>) {
  const params = await promisedParams;

  const { virtualLabId, projectId } = params;

  const session = await auth();
  if (!session) return;

  const { papers, total } = await retrievePapersList({
    virtualLabId,
    projectId,
    accessToken: session.accessToken,
  });

  return (
    <div
      id="project-papers-container"
      className="relative mt-4 flex h-full max-h-[calc(100vh-9rem)] flex-col bg-white p-8"
    >
      <PaperListView {...{ total, papers }} />
      <Link
        className="bg-primary-8 mt-auto flex max-w-max items-center justify-center self-end px-8 py-4 text-white"
        type="primary"
        href={`${generateVlProjectUrl(virtualLabId, projectId)}/papers/create`}
      >
        Create new paper
      </Link>
    </div>
  );
}
