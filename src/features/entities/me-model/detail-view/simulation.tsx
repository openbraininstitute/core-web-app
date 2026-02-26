'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { ErrorBoundary } from '@sentry/nextjs';
import { Spin } from 'antd';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getSingleNeuronSimulations } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { tryCatch } from '@/api/utils';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import SimulationDetail from '@/features/entities/neuron-simulation/simulation-results/simulation-details';

import type { ISingleNeuronSimulation } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  modelId: string;
};

export default function Results({ modelId }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const [simulations, setSimulations] = useState<Array<ISingleNeuronSimulation>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function getSimulations() {
      setLoading(true);
      const { data: result, error: returnedError } = await tryCatch(
        getSingleNeuronSimulations({
          context: { virtualLabId, projectId },
          filters: { me_model__id: modelId },
          withFacets: false,
        }),
        () => setLoading(false)
      );

      if (result) setSimulations(result.data);
      if (returnedError) setError(!!returnedError);
    }

    getSimulations();
  }, [modelId, virtualLabId, projectId]);

  if (loading) {
    return (
      <div className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-3">
        <Spin indicator={<LoadingOutlined />} size="large" />
        <h2 className="text-primary-9 font-light">Loading experiments...</h2>
      </div>
    );
  }

  if (!simulations || !simulations.length) {
    return (
      <div className="text-primary-9 flex h-full flex-col items-center justify-center text-2xl font-bold">
        <h2>No simulations available</h2>
        <p className="mt-4 max-w-2xl text-center text-sm font-light text-gray-500">
          It looks like you haven’t run any simulations yet. To view your simulations here, please
          start a new simulation. Once completed, the results will appear on this page for further
          review and analysis.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-primary-9 flex h-full flex-col items-center justify-center text-2xl font-bold">
        <h2>Failed to Load Simulations</h2>
        <p className="mt-4 max-w-2xl text-center text-sm font-light text-gray-500">
          An error occurred while fetching your simulations. Please check your connection and try
          again. If the issue persists, contact support or try refreshing the page to reload the
          simulations
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {simulations.map((sim, indx) => (
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
