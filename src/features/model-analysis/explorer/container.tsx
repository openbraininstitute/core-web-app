'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import { match } from 'ts-pattern';
import { useMemo } from 'react';
import { Spin } from 'antd';

import { validationResultAtom } from '@/features/model-analysis/explorer/context';
import { ViewerContainer } from '@/features/model-analysis/viewer/container';
import { useLoadableValue } from '@/hooks/hooks';

import type { WorkspaceContext } from '@/types/common';

export default function Analysis() {
  const { virtualLabId, projectId, id } = useParams<WorkspaceContext & { id: string }>();

  const results = useLoadableValue(
    useMemo(
      () => validationResultAtom({ workspace: { virtualLabId, projectId }, id }),
      [virtualLabId, projectId, id]
    )
  );
  console.log('🚀 [container] results =', results); // @FIXME: Remove this line written on 2025-11-03 at 14:46

  return match(results)
    .with({ state: 'loading' }, () => {
      return (
        <div className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-3">
          <Spin indicator={<LoadingOutlined />} size="large" />
          <h2 className="text-primary-9 font-light">Loading analysis...</h2>
        </div>
      );
    })
    .with({ state: 'hasError' }, (_error) => {
      return (
        <div className="flex h-full items-center justify-center text-xl font-bold text-red-500">
          Error loading ME-Model analysis
        </div>
      );
    })
    .with({ state: 'hasData' }, ({ data }) => {
      if (!data || data.length === 0) {
        return (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="text-primary-9 flex flex-col items-center justify-center text-2xl font-bold">
              <h2>No analysis available</h2>
              <p className="mt-4 max-w-2xl text-center text-sm font-light text-gray-500">
                It looks like you haven’t run any analysis yet. To view your analysis here, please
                start a new analysis. Once completed, the results will appear on this page for
                further review and analysis.
              </p>
            </div>
          </div>
        );
      }
      return <ViewerContainer validationResults={data} />;
    })
    .exhaustive(() => null);
}
