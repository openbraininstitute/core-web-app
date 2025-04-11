import { useAtomValue } from 'jotai';

import { meModelResourceAtom } from '@/state/virtual-lab/build/me-model';
import { PDFViewerContainer } from '@/components/explore-section/common/pdf/PDFViewerContainer';

import { ensureArray, getOrgFromSelfUrl, getProjectFromSelfUrl } from '@/util/nexus';
import { MEModel } from '@/types/me-model';

const statusMessage: Record<MEModel['status'], string> = {
  initialized: 'No ME-Model analysis yet',
  running: 'ME-Model analysis is running',
  done: 'ME-Model analysis done',
  failed: 'ME-Model analysis failed',
};

export default function AnalysisPreview() {
  const meModelResource = useAtomValue(meModelResourceAtom);

  if (!meModelResource) return null;

  const nexusContext = {
    org: getOrgFromSelfUrl(meModelResource._self),
    project: getProjectFromSelfUrl(meModelResource._self),
  };
  const distributions = ensureArray(meModelResource?.image).map((image) => ({
    ...image,
    ...nexusContext,
  })) as unknown as { '@id': string; about: string; org?: string; project?: string }[];

  const message = meModelResource.status
    ? statusMessage[meModelResource.status]
    : statusMessage.initialized;

  if (!distributions || ['initialized', 'running', 'failed'].includes(meModelResource.status)) {
    return (
      <div className="text-primary-9 flex h-full items-center justify-center text-4xl font-bold">
        {message}
      </div>
    );
  }

  return <PDFViewerContainer distributions={distributions} />;
}
