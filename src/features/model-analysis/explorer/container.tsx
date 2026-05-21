'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { useParams } from 'next/navigation';

import { getEntityByCoreType } from '@/entity-configuration/domain/helpers';
import { useAnalysis } from '@/features/model-analysis/explorer/use-analysis';
import { useInputResistance } from '@/features/model-analysis/explorer/use-input-resistance';
import { ViewerContainer } from '@/features/model-analysis/viewer/container/container';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  detailViewHeadingClass,
  detailViewValueClass,
  type DetailViewVariant,
} from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';

export default function Analysis({
  entity,
  variant = 'light',
}: {
  entity: TRetrieveEntityOutput;
  variant?: DetailViewVariant;
}) {
  const workspace = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading } = useAnalysis({ workspace, id });
  const { data: rin, isLoading: loadingRin } = useInputResistance({ entity });
  const entityConfig = getEntityByCoreType({ type: entity.type });

  if (isLoading || loadingRin) {
    return (
      <div className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-3">
        <Spin indicator={<LoadingOutlined />} size="large" />
        <h2 className={cn('font-light', detailViewValueClass(variant))}>Loading analysis...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-xl font-bold text-red-500">
        Error loading {entityConfig?.title} analysis
      </div>
    );
  }

  if (data?.data.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div
          className={cn(
            'flex flex-col items-center justify-center text-2xl font-bold',
            detailViewValueClass(variant)
          )}
        >
          <h2 className={detailViewHeadingClass(variant, '2xl')}>No analysis available</h2>
          <p
            className={cn(
              'mt-4 max-w-2xl text-center text-sm font-light',
              variant === 'onPrimary' ? 'text-primary-3' : 'text-gray-500'
            )}
          >
            It looks like you haven&apos;t run any analysis yet. To view your analysis here, please
            start a new analysis. Once completed, the results will appear on this page for further
            review and analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ViewerContainer
      entity={entity}
      rin={rin}
      validationResults={data?.data ?? []}
      variant={variant}
    />
  );
}
