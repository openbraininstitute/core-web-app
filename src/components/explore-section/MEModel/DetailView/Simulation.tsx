import React, { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { ErrorBoundary } from '@sentry/nextjs';
import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';

import SimulationDetail from './SimulationDetails';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { queryES } from '@/api/nexus';
import { getSimulationsPerModelQuery } from '@/queries/es';
import { selectedMEModelIdAtom } from '@/state/virtual-lab/build/me-model';
import { SingleNeuronSimulation } from '@/types/nexus';
import { getSession } from '@/authFetch';

type LocationParams = {
  projectId: string;
  virtualLabId: string;
};

export default function Simulation({ params }: { params: LocationParams }) {
  const selectedMEModelId = useAtomValue(selectedMEModelIdAtom);
  const [simulations, setSimulations] = useState<SingleNeuronSimulation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!selectedMEModelId) return;

    const fetchSims = async () => {
      setLoading(true);
      setError(false);
      try {
        const session = await getSession();
        if (!session) return;
        const simulationsPerMEModelQuery = getSimulationsPerModelQuery({
          modelId: selectedMEModelId,
          type: 'SingleNeuronSimulation',
        });
        const sims = await queryES<SingleNeuronSimulation>(simulationsPerMEModelQuery, session, {
          org: params.virtualLabId,
          project: params.projectId,
        });
        setSimulations(sims);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSims();
  }, [params.projectId, params.virtualLabId, selectedMEModelId]);

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
        <ErrorBoundary fallback={SimpleErrorComponent} key={sim['@id']}>
          <SimulationDetail<SingleNeuronSimulation> simulation={sim} index={indx} />
        </ErrorBoundary>
      ))}
    </div>
  );
}
