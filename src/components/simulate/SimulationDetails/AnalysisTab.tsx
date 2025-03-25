import { PDFViewerContainer } from '@/components/explore-section/common/pdf/PDFViewerContainer';
import { NexusMEModel } from '@/types/me-model';

export default function AnalysisTab({ meModel }: { meModel: NexusMEModel | null }) {
  const image = meModel?.image;

  if (!image || meModel?.status !== 'done') {
    return (
      <div className="flex h-full items-center justify-center py-12 text-4xl font-bold text-primary-9">
        No ME-Model analysis yet
      </div>
    );
  }

  return <PDFViewerContainer distributions={meModel.image as { '@id': string; about: string }[]} />;
}
