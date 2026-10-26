import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getTaskConfig } from '@/api/entitycore/queries/task';
import { getAsset } from '@/api/entitycore/selectors/assets';
import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { usedTaskConfigId } from '@/entity-configuration/domain/simulation/task-result-campaign';

import type { WorkspaceContext } from '@/types/common';

/**
 * Id of the e-feature extraction TaskResult an e-model was optimised on (its optimisation
 * targets), or `null` when the e-model was not optimised on the platform.
 *
 * Walks provenance like the obi-one validation task does: e-model → optimisation `__execution`
 * activity → its TaskConfig → `target_efeatures.task_result`.
 */
export async function resolveOptimisationTargetEFeaturesId(
  emodelId: string,
  context: WorkspaceContext
): Promise<string | null> {
  const configId = await usedTaskConfigId(
    emodelId,
    TaskActivityType.EModelOptimizationExecution,
    context
  );
  if (!configId) return null;

  const taskConfig = await getTaskConfig({ id: configId, context });
  const configAsset = getAsset({
    assets: taskConfig.assets ?? [],
    label: AssetLabel.task_config,
  }).getOneOrNull();
  if (!configAsset) return null;

  const response = await downloadAsset({
    entityId: taskConfig.id,
    entityType: EntityTypeDict.TaskConfig,
    id: configAsset.id,
    ctx: context,
    asRawResponse: true,
  });
  const config = (await response.json()) as {
    target_efeatures?: { task_result?: { id_str?: string } | null } | null;
  };
  return config.target_efeatures?.task_result?.id_str ?? null;
}
