import { kebabCase } from 'es-toolkit/compat';
import Link from 'next/link';

import { config } from '@/config';
import { WorkflowActivityDictValue } from '@/constants';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { getWorkflow } from '@/ui/segments/workflows/config';
import { WorkflowConfigureUseModelLink } from '@/ui/segments/workflows/elements/workflow-link';
import {
  PanelQueryParam,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export function WorkflowBuildActions<T extends EntityCoreObjectTypes>({
  record,
  dataType,
  workflowTargetType,
  hideUseModelAction = false,
}: {
  record: T;
  dataType?: TExtendedEntitiesTypeDict;
  workflowTargetType?: TExtendedEntitiesTypeDict;
  hideUseModelAction?: boolean;
}) {
  const { virtualLabId, projectId } = useWorkspace();

  const sourceType = (dataType ?? record.type) as TExtendedEntitiesTypeDict;
  const workflow = getWorkflow({
    activity: WorkflowActivityDictValue.build,
    sourceType,
    targetType: workflowTargetType,
  });
  const targetType = workflowTargetType ?? workflow?.targetType;
  const useModelButtonClassName =
    'hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]';

  if (!targetType) {
    return null;
  }

  return (
    <div className="sticky bottom-0 mt-auto flex items-center justify-center gap-2 self-end p-4">
      <Button
        rounded
        asChild
        title="Go to details page"
        variant="default"
        className={useModelButtonClassName}
      >
        <Link
          href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(record.type)}/${record.id}`}
        >
          View details
        </Link>
      </Button>
      {!hideUseModelAction && (
        <WorkflowConfigureUseModelLink
          rounded
          title="Start build"
          variant="default"
          className={useModelButtonClassName}
          activity={WorkflowActivityDictValue.build}
          targetType={targetType}
          entityType={sourceType}
          entityId={record.id}
          query={{
            [PanelQueryParam]: WorkflowSimulatePanels.Configuration,
          }}
        >
          Use model
        </WorkflowConfigureUseModelLink>
      )}
    </div>
  );
}
