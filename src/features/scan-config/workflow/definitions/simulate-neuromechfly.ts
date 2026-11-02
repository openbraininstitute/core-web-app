import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/whole-brain-circuit-simulation';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

/** A Brian2 whole-brain circuit walking the NeuroMechFly body: its own launch task type. */
export const simulateNeuroMechFlyWorkflow = defineScanConfigWorkflow({
  id: 'simulate-neuromechfly',
  activity: ScanConfigActivity.Simulate,
  entity: {
    mode: ScanConfigEntitySourceMode.Session,
  },
  campaign: { resolve: resolveSimulationByCampaignId },
  editor: {
    campaignOriginAction: ScanConfigCampaignOriginActionDict.Task,
  },
  taskTypeBindings: () => ({
    obiOne: ObiOneTaskTypeDict.CircuitSimulationNeuroMechFly,
    configGeneration: TaskActivityType.CircuitSimulationConfigGeneration,
    execution: TaskActivityType.CircuitSimulationExecution,
    config: TaskConfigType.CircuitSimulationConfig,
  }),
});
