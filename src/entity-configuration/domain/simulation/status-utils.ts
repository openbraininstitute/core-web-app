const SONATA_SIMULATION_CONFIG_LABEL = 'sonata_simulation_config';

type SimulationLike = {
  id: string;
  assets?: Array<{ label?: string }>;
};

type ExecutionLike<TStatus extends string = string> = {
  creation_date: string;
  status: TStatus;
  used?: Array<{ id: string }>;
};

export function hasSimulationConfigAsset(simulation: SimulationLike) {
  return (
    simulation.assets?.some((asset) => asset.label === SONATA_SIMULATION_CONFIG_LABEL) ?? false
  );
}

export function getLatestSimulationExecution<T extends { creation_date: string }>({
  executions,
}: {
  executions: T[];
}): T | undefined {
  return [...executions].sort((a, b) => a.creation_date.localeCompare(b.creation_date)).at(-1);
}

export function getSimulationStatusFromExecutions<TStatus extends string>({
  simulation,
  executions,
  createdStatus,
  errorStatus,
}: {
  simulation: SimulationLike;
  executions: Array<ExecutionLike<TStatus>>;
  createdStatus: TStatus;
  errorStatus: TStatus;
}) {
  const fallbackStatus = hasSimulationConfigAsset(simulation) ? createdStatus : errorStatus;
  const latestExecution = getLatestSimulationExecution({ executions });

  return latestExecution?.status ?? fallbackStatus;
}

export function getSimulationStatusMap<TStatus extends string>({
  simulations,
  executions,
  createdStatus = 'created' as TStatus,
  errorStatus = 'error' as TStatus,
}: {
  simulations: Array<SimulationLike>;
  executions: Array<ExecutionLike<TStatus>>;
  createdStatus?: TStatus;
  errorStatus?: TStatus;
}) {
  const executionsBySimulationId = executions.reduce<Map<string, Array<ExecutionLike<TStatus>>>>(
    (map, execution) => {
      execution.used?.forEach((used) => {
        map.set(used.id, [...(map.get(used.id) ?? []), execution]);
      });
      return map;
    },
    new Map()
  );

  return simulations.reduce<Map<string, TStatus>>((map, simulation) => {
    const status = getSimulationStatusFromExecutions({
      simulation,
      executions: executionsBySimulationId.get(simulation.id) ?? [],
      createdStatus,
      errorStatus,
    });

    map.set(simulation.id, status);
    return map;
  }, new Map());
}

export function getSimulationStatusCountMap<TStatus extends string>({
  simulations,
  executions,
  createdStatus = 'created' as TStatus,
  errorStatus = 'error' as TStatus,
}: {
  simulations: Array<SimulationLike>;
  executions: Array<ExecutionLike<TStatus>>;
  createdStatus?: TStatus;
  errorStatus?: TStatus;
}) {
  const statusMap = getSimulationStatusMap({
    simulations,
    executions,
    createdStatus,
    errorStatus,
  });

  return Array.from(statusMap.values()).reduce<Map<TStatus, number>>((map, status) => {
    map.set(status, (map.get(status) ?? 0) + 1);
    return map;
  }, new Map());
}
