import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { LoadingOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import { Spin } from 'antd';

import SimulationDetail from './simulation-details';
import { withErrorConfig } from '@/components/GenericErrorFallback';

import { SingleNeuronSimulation } from '@/types/nexus';

import type { WorkspaceContext } from '@/types/common';
import { getSingleNeuronSimulations } from '@/api/entitycore/queries';
import { ISingleNeuronSimulation } from '@/api/entitycore/types';

export default function Simulation() {
  const params = useParams<WorkspaceContext & { id: string }>();
  const [simulations, setSimulations] = useState<ISingleNeuronSimulation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { virtualLabId, projectId, id } = params;

  useEffect(() => {
    const fetchSims = async () => {
      setLoading(true);
      setError(false);
      try {
        const sims = await getSingleNeuronSimulations({
          context: { virtualLabId, projectId },
          withFacets: false,
          filters: {
            me_model_id: id,
          },
        });

        setSimulations(sims.data);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSims();
  }, [projectId, virtualLabId, id]);

  if (loading) {
    return (
      <div className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-3">
        <Spin indicator={<LoadingOutlined />} size="large" />
        <h2 className="text-primary-9 font-light">Loading simulations...</h2>
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
          FallbackComponent={withErrorConfig({
            cls: { container: 'bg-white' },
            showButtons: false,
            customError: 'Error while loading simulation ',
          })}
          key={sim.id}
        >
          <SimulationDetail
            simulation={sim}
            index={indx}
            virtualLabId={virtualLabId}
            projectId={projectId}
          />
        </ErrorBoundary>
      ))}
    </div>
  );
}
