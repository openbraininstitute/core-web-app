'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { ErrorBoundary } from '@sentry/nextjs';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';

import { getSingleNeuronSimulations } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { type TViewVariant, ViewVariant } from '@/constants';
import { SimulationDetail } from '@/features/entities/neuron-simulation/simulation-results/simulation-details';
import {
  detailViewHeadingClass,
  detailViewInsetPanelClass,
  detailViewValueClass,
} from '@/ui/segments/detail-view/variant-styles';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { ISingleNeuronSimulation } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  modelId: string;
  context: WorkspaceContext;
  variant?: TViewVariant;
};

export default function Results({ modelId, context, variant = ViewVariant.Light }: Props) {
  const {
    data: simulations,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: keyBuilder.entities({
      context,
      filters: { synaptome__id: modelId },
      withFacets: false,
    }),
    queryFn: () =>
      getSingleNeuronSimulations({
        context,
        filters: { me_model__id: modelId },
        withFacets: false,
      }),
    refetchOnWindowFocus: false,
  });

  if (loading) {
    return (
      <div className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-3">
        <Spin indicator={<LoadingOutlined />} size="large" />
        <h2 className={cn('font-light', detailViewValueClass(variant))}>Loading experiments...</h2>
      </div>
    );
  }

  if (!simulations?.data.length) {
    return (
      <div
        className={cn(
          'flex h-full flex-col items-center justify-center text-2xl font-bold',
          detailViewValueClass(variant)
        )}
      >
        <h2 className={detailViewHeadingClass(variant, '2xl')}>No simulations available</h2>
        <p
          className={cn(
            'mt-4 max-w-2xl text-center text-sm font-light',
            variant === ViewVariant.Default ? 'text-primary-3' : 'text-gray-500'
          )}
        >
          It looks like you haven’t run any simulations yet. To view your simulations here, please
          start a new simulation. Once completed, the results will appear on this page for further
          review and analysis.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex h-full flex-col items-center justify-center text-2xl font-bold',
          detailViewValueClass(variant)
        )}
      >
        <h2 className={detailViewHeadingClass(variant, '2xl')}>Failed to Load Simulations</h2>
        <p
          className={cn(
            'mt-4 max-w-2xl text-center text-sm font-light',
            variant === ViewVariant.Default ? 'text-primary-3' : 'text-gray-500'
          )}
        >
          An error occurred while fetching your simulations. Please check your connection and try
          again. If the issue persists, contact support or try refreshing the page to reload the
          simulations
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-2',
        variant === ViewVariant.Default && detailViewInsetPanelClass(variant)
      )}
    >
      {simulations.data.map((sim, indx) => (
        <ErrorBoundary
          fallback={({ error: returnedError }) =>
            withErrorConfig({
              cls: { container: 'bg-white' },
              showButtons: false,
              customError: 'Error while loading experiment',
            })({ error: returnedError as (Error & { cause?: unknown }) | undefined })
          }
          key={sim.id}
        >
          <SimulationDetail<ISingleNeuronSimulation>
            index={indx}
            type={EntityTypeDict.SingleNeuronSimulation}
            simulation={sim}
          />
        </ErrorBoundary>
      ))}
    </div>
  );
}
