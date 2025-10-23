import { CircuitSimulationExecutionStatus } from '@/api/entitycore/types/entities/circuit-simulation-execution';

export const simulationStatusColorMap = {
  [CircuitSimulationExecutionStatus.CREATED]: '#1890ff',
  [CircuitSimulationExecutionStatus.PENDING]: '#fa8c16',
  [CircuitSimulationExecutionStatus.RUNNING]: '#389e0d',
  [CircuitSimulationExecutionStatus.ERROR]: '#f5222d',
  [CircuitSimulationExecutionStatus.DONE]: '#002766',
};
