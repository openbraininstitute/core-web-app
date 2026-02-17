'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { useParams } from 'next/navigation';

import { useAnalysis } from '@/features/model-analysis/explorer/use-analysis';
import { ViewerContainer } from '@/features/model-analysis/viewer/container/container';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import { useInputResistance } from './use-input-resistance';

export default function Analysis() {
  const workspace = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading } = useAnalysis({ workspace, id });
  const rin = useInputResistance(id);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-3">
        <Spin indicator={<LoadingOutlined />} size="large" />
        <h2 className="text-primary-9 font-light">Loading analysis...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-xl font-bold text-red-500">
        Error loading ME-Model analysis
      </div>
    );
  }

  if (data?.data.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="text-primary-9 flex flex-col items-center justify-center text-2xl font-bold">
          <h2>No analysis available</h2>
          <p className="mt-4 max-w-2xl text-center text-sm font-light text-gray-500">
            It looks like you haven&apos;t run any analysis yet. To view your analysis here, please
            start a new analysis. Once completed, the results will appear on this page for further
            review and analysis.
          </p>
        </div>
      </div>
    );
  }

  return <ViewerContainer rin={rin} validationResults={data?.data ?? []} />;
}
