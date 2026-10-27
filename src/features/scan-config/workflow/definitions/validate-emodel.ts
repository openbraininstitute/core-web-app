import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { EModelValidationCampaign } from '@/entity-configuration/domain/validation/emodel-validation-campaign';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ScanConfigActivity, ValidateScanConfigTabs } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

export const validateEModelWorkflow = defineScanConfigWorkflow({
  id: 'validate-emodel',
  activity: ScanConfigActivity.Validate,
  entity: {
    // the e-model validation scan-config has no `model_identifier` field (the e-model and the
    // target e-features are picked in the editor), so configure opens on an empty session
    mode: ScanConfigEntitySourceMode.Session,
    picksEntitiesInEditor: true,
  },
  campaign: {
    resolve: async ({ id, context }) => {
      // biome-ignore lint/style/noNonNullAssertion: resolve is defined on this domain config
      return await EModelValidationCampaign.api.query.resolve!({ id, context });
    },
  },
  editor: {
    className: 'px-4',
    campaignOriginAction: ScanConfigCampaignOriginActionDict.Task,
    defaultTab: {
      __activity: ScanConfigActivity.Validate,
      id: ValidateScanConfigTabs.configuration,
    },
  },
  taskTypeBindings: {
    obiOne: ObiOneTaskTypeDict.EModelValidation,
    configGeneration: TaskActivityType.EModelValidationConfigGeneration,
    execution: TaskActivityType.EModelValidationExecution,
    config: TaskConfigType.EModelValidationConfig,
  },
});
