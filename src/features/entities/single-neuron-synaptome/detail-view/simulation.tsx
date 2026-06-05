'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { ErrorBoundary } from '@sentry/nextjs';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';

import { getSingleNeuronSynaptomeSimulations } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { type TViewVariant, ViewVariant } from '@/constants';
import SimulationDetail from '@/features/entities/neuron-simulation/simulation-results/simulation-details';
import ConfigItem from '@/features/entities/single-neuron-synaptome/build/elements/config-item';
import {
  detailViewHeadingClass,
  detailViewInsetPanelClass,
  detailViewValueClass,
} from '@/ui/segments/detail-view/variant-styles';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { ISingleNeuronSynaptomeSimulation } from '@/api/entitycore/types';
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
      getSingleNeuronSynaptomeSimulations({
        context,
        filters: { synaptome__id: modelId },
        withFacets: false,
      }),
    refetchOnWindowFocus: false,
  });

  if (loading) {
    return (
      <div className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-3">
        <Spin indicator={<LoadingOutlined />} size="large" />
        <h2 className={cn('font-light', detailViewValueClass(variant))}>Loading experiment...</h2>
      </div>
    );
  }

  if (!simulations || !simulations?.data.length) {
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
          fallback={withErrorConfig({
            cls: { container: 'bg-white' },
            showButtons: false,
            customError: 'Error while loading experiment ',
          })({ error: error ? new Error('Failed to load experiment') : undefined })}
          key={sim.id}
        >
          <SimulationDetail<ISingleNeuronSynaptomeSimulation>
            type={EntityTypeDict.SingleNeuronSynaptomeSimulation}
            simulation={sim}
            index={indx}
          >
            {({ config }) => {
              if (!config.synaptome) return null;
              return (
                <>
                  <div className="text-primary-8 text-lg font-bold">Synaptic Inputs</div>
                  <div className="flex flex-wrap gap-4">
                    {config.synaptome.map((c, ind) => (
                      <div
                        key={c.id}
                        className="flex w-max min-w-96 flex-col items-start justify-start"
                      >
                        <div
                          className="flex items-center justify-center px-4 py-2 text-base text-white"
                          style={{
                            backgroundColor: c.color,
                          }}
                        >
                          {ind + 1}
                        </div>
                        <div className="flex w-full flex-col gap-5 border border-gray-300 p-6">
                          <div className="grid grid-cols-3 gap-2">
                            <ConfigItem {...{ label: 'delay', value: c.delay, unit: 'ms' }} />
                            <ConfigItem {...{ label: 'duration', value: c.duration, unit: 'ms' }} />
                            <ConfigItem
                              {...{ label: 'frequency', value: c.frequency, unit: 'hz' }}
                            />
                            <ConfigItem {...{ label: 'weight scalar', value: c.weight_scalar }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            }}
          </SimulationDetail>
        </ErrorBoundary>
      ))}
    </div>
  );
}
