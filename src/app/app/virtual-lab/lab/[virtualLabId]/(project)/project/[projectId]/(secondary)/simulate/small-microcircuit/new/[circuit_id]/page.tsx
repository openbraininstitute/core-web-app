'use client';

import isEqual from 'lodash/isEqual';
import NextImage from 'next/image';
import { LoadingOutlined, RightOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import SimulationConfig from '@/features/small-microcircuit';
import { WorkspaceContext } from '@/types/common';

type Params = WorkspaceContext & { circuit_id: string };

export default function SmallMicroCircuitConfiguration() {
  const { circuit_id: circuitId, virtualLabId, projectId } = useParams<Params>();
  return (
    <SimulationConfig circuitId={circuitId} virtualLabId={virtualLabId} projectId={projectId} />
  );
}

/* --------------------------------- Simulation tab related code -------------------------------- */

type SimulationTabProps = {
  campaignId: string;
  // context: WorkspaceContext;
  virtualLabId: string;
  projectId: string;
};

const simulationsAtomFamily = readAtomFamilyWithExpiration(
  ({
    campaignId,
    virtualLabId,
    projectId,
  }: {
    campaignId: string;
    virtualLabId: string;
    projectId: string;
  }) =>
    atom<Promise<ICircuitSimulation[]>>(async () => {
      if (!campaignId) return [];

      const filters = { simulation_campaign_id: campaignId };
      const context = { virtualLabId, projectId };
      const res = await getCircuitSimulations({ filters, context });

      return res.data;
    }),
  {
    ttl: 120_000, // 2 minutes
    areEqual: isEqual,
  }
);

function SimulationsTab({ campaignId, virtualLabId, projectId }: SimulationTabProps) {
  // TODO Extend the component to support multiple simulations

  const notification = useAppNotification();

  const [execStatus, setExecStatus] = useState<Status>('created');
  const [simRequestSent, setSimRequestSent] = useState<boolean>(false);

  const simulationsAtom = simulationsAtomFamily({
    campaignId,
    virtualLabId,
    projectId,
  });

  const simulations = useAtomValue(simulationsAtom);

  const run = () => {
    try {
      runCircuitSimulation({
        ctx: { virtualLabId, projectId },
        simulationId: simulations[0].id,
        onMessage: (msg) => setExecStatus(msg.status as Status),
      });
      setSimRequestSent(true);
    } catch (error) {
      notification.error({
        message: 'Error while requesting simulation run. Please try again later',
      });
    }
  };

  const launchSimBtnLabelPrefix = simulations.length ? `(${simulations.length})` : '';

  return (
    <div className="grid min-h-0 flex-grow grid-cols-[1fr_3fr] gap-5">
      <div className="flex h-full flex-col items-center gap-5 overflow-y-auto border-r border-gray-200 pr-5">
        {simulations.map((simulation) => (
          <SimulationListItem
            key={simulation.id}
            simulation={simulation}
            execStatus={execStatus}
            // selected
            onSelect={() => {}}
          />
        ))}
        <button
          className={classNames(
            'w-full cursor-pointer rounded-3xl p-2 text-white',
            'bg-[linear-gradient(94.93deg,_#389E0D_18.84%,_#143805_116.7%)]',
            'disabled:cursor-not-allowed disabled:bg-gray-400 disabled:bg-none'
          )}
          type="button"
          onClick={run}
          disabled={simRequestSent}
        >
          Launch simulations {launchSimBtnLabelPrefix}
        </button>
      </div>
      {simulations.length > 0 && (
        <SimulationDetails
          simulation={simulations[0]}
          execStatus={execStatus}
          virtualLabId={virtualLabId}
          projectId={projectId}
        />
      )}
    </div>
  );
}

type SimulationBlockProps = {
  simulation: ICircuitSimulation;
  execStatus?: Status;
  // selected: boolean;
  onSelect: (simulationId: string) => void;
};

function SimulationListItem({ simulation, execStatus, onSelect }: SimulationBlockProps) {
  return (
    <button
      type="button"
      className="w-full cursor-pointer rounded-lg bg-white p-4"
      onClick={() => onSelect(simulation.id)}
    >
      <div className="flex items-center justify-between">
        <div>{simulation.name}</div>
        <div>
          <SimulationStatusBadge status={execStatus ?? 'created'} />
          <RightOutlined className="ml-2 text-sm" />
        </div>
      </div>
    </button>
  );
}

type Status = 'created' | 'pending' | 'running' | 'done' | 'error';

const statusColorMap: Record<Status, string> = {
  created: '#434343',
  pending: '#fa8c16',
  running: '#1890ff',
  done: '#389e0d',
  error: '#f5222d',
};

function SimulationStatusBadge({ status }: { status: Status }) {
  const color = statusColorMap[status] ?? 'pink';

  return (
    <span style={{ borderColor: color, color }} className="rounded-xl border-1 px-2">
      {status}
    </span>
  );
}

const simulationResultAtomFamily = readAtomFamilyWithExpiration(
  ({
    simulationId,
    virtualLabId,
    projectId,
  }: {
    simulationId: string;
    virtualLabId: string;
    projectId: string;
  }) =>
    atom<Promise<ICircuitSimulationResult>>(async () => {
      const simulationExecutionFilters = { used__id: simulationId };
      const context = { virtualLabId, projectId };
      const res = await getCircuitSimulationExecutions({
        filters: simulationExecutionFilters,
        context,
      });

      const execution = res.data[0];
      if (!execution?.generated?.[0]) {
        throw new Error('Simulation Result not found');
      }

      const simulationResult = getCircuitSimulationResult({
        id: execution.generated[0].id,
        context,
      });

      return simulationResult;
    }),
  {
    ttl: 120_000, // 2 minutes
    areEqual: isEqual,
  }
);

type SimulationDetailsProps = {
  simulation: ICircuitSimulation;
  execStatus: Status;
  virtualLabId: string;
  projectId: string;
};

function SimulationDetails({
  simulation,
  execStatus,
  virtualLabId,
  projectId,
}: SimulationDetailsProps) {
  const color = statusColorMap[execStatus] ?? 'pink';

  return (
    <div className="bg-white p-4">
      <small className="text-gray-400">Name</small>
      <div className="mb-8 flex items-center justify-between">
        <h1 style={{ color }} className="text-3xl font-bold">
          {simulation.name}
        </h1>
        <div>
          <ButtonCopyId label="Copy simulation ID" value={simulation.id} />
        </div>
      </div>
      {execStatus === 'done' && (
        <Suspense>
          <SimulationResultTraceViewer
            key={simulation.id}
            simulationId={simulation.id}
            virtualLabId={virtualLabId}
            projectId={projectId}
          />
        </Suspense>
      )}
    </div>
  );
}

type SimulationResultTraceViewerProps = {
  simulationId: string;
  virtualLabId: string;
  projectId: string;
};

function SimulationResultTraceViewer({
  simulationId,
  virtualLabId,
  projectId,
}: SimulationResultTraceViewerProps) {
  const simulationResultAtom = simulationResultAtomFamily({
    simulationId,
    virtualLabId,
    projectId,
  });

  const simulationResult = useAtomValue(simulationResultAtom);

  const ctx = useMemo(() => ({ projectId, virtualLabId }), [projectId, virtualLabId]);

  return <EphysViewer resource={simulationResult} ctx={ctx} />;
}
