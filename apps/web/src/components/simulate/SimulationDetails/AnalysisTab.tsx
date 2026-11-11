import type { IMEModel } from '@/api/entitycore/types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function AnalysisTab({ meModel }: { meModel: IMEModel | null }) {
  // const image = meModel?.image;

  // if (!image || meModel?.status !== 'done') {
  //   return (
  //     <div className="text-primary-9 flex h-full items-center justify-center py-12 text-4xl font-bold">
  //       No ME-Model analysis yet
  //     </div>
  //   );
  // }

  // return <PDFViewerContainer distributions={meModel.image as { '@id': string; about: string }[]} />;
  return null;
}
