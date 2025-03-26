import { useAtomValue } from 'jotai';

import { meModelResourceAtom } from '@/state/virtual-lab/build/me-model';
import { PDFViewerContainer } from '@/components/explore-section/common/pdf/PDFViewerContainer';

import { ensureArray } from '@/util/nexus';

export default function AnalysisPreview() {
  const meModelResource = useAtomValue(meModelResourceAtom);
  const image = meModelResource?.image;

  if (!image || meModelResource?.status !== 'done') {
    return (
      <div className="flex h-full items-center justify-center text-4xl font-bold text-primary-9">
        No ME-Model analysis yet
      </div>
    );
  }

  return (
    <PDFViewerContainer distributions={ensureArray(image) as { '@id': string; about: string }[]} />
  );
}
