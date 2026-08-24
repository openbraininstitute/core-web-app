import { kebabCase } from 'es-toolkit/compat';
import Link from 'next/link';

import { type EntityCoreObjectTypes, EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { WorkflowActivityDictValue } from '@/constants';
import {
  getWorkflowLifecycleBlockReason,
  type TLifecycleStatusCarrier,
} from '@/entity-configuration/domain/workflow-lifecycle-eligibility';
import { createWorkflowSessionId } from '@/features/scan-config/workflow/session';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { getWorkflow, WORKFLOW_SESSION_ID_SEARCH_PARAM } from '@/ui/segments/workflows/config';
import { WorkflowUseModelButton } from '@/ui/segments/workflows/elements/use-model-button';
import {
  WORKFLOW_BLOCKED_ACTION_CLASS,
  WorkflowBlockedActionTooltip,
} from '@/ui/segments/workflows/elements/workflow-blocked-action-tooltip';
import {
  PanelQueryParam,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { cn } from '@/utils/css-class';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export function WorkflowBuildActions<T extends EntityCoreObjectTypes>({
  record,
  dataType,
  hideUseModelAction,
  workflowTargetType,
}: {
  record: T;
  dataType?: TExtendedEntitiesTypeDict;
  hideUseModelAction?: boolean;
  workflowTargetType?: TExtendedEntitiesTypeDict;
}) {
  const { virtualLabId, projectId } = useWorkspace();

  const sourceType = (dataType ?? record.type) as TExtendedEntitiesTypeDict;
  const workflow = getWorkflow({
    activity: WorkflowActivityDictValue.build,
    sourceType,
  });
  const configureSegment = kebabCase(workflow?.targetType ?? record.type);

  const effectiveDataType =
    record.type === EntityTypeDict.Circuit &&
    (record as ICircuit).scale === CircuitScaleDictionary.Single
      ? ExtendedEntitiesTypeDict.SingleNeuronCircuit
      : (record.type as TExtendedEntitiesTypeDict);

  const detailUrl = resolveExploreDetailsPageUrl({
    ctx: { virtualLabId, projectId },
    entityId: record.id,
    dataType: effectiveDataType,
  });

  const useModelBlockReason = getWorkflowLifecycleBlockReason(record as TLifecycleStatusCarrier);
  const useModelClassName =
    'hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]';

  return (
    <div className="sticky bottom-0 mt-auto flex items-center justify-center gap-2 self-end p-4">
      <Button
        rounded
        asChild
        title="Go to details page"
        variant="default"
        className="hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
      >
        <Link href={detailUrl}>View details</Link>
      </Button>
      {!hideUseModelAction &&
        (workflowTargetType ? (
          <WorkflowUseModelButton
            activity={WorkflowActivityDictValue.build}
            targetType={workflowTargetType}
            entityId={record.id}
            entityType={sourceType}
            entity={record as TLifecycleStatusCarrier}
            query={{ [PanelQueryParam]: WorkflowSimulatePanels.Configuration }}
            title="Start build"
            rounded
            className={useModelClassName}
          >
            Use model
          </WorkflowUseModelButton>
        ) : (
          <WorkflowBlockedActionTooltip reason={useModelBlockReason} side="left" align="end">
            <Button
              rounded
              asChild={!useModelBlockReason}
              title={useModelBlockReason ? undefined : 'Start build'}
              variant="default"
              disabled={Boolean(useModelBlockReason)}
              className={
                useModelBlockReason
                  ? cn('h-12 px-10 font-bold', WORKFLOW_BLOCKED_ACTION_CLASS)
                  : useModelClassName
              }
            >
              {useModelBlockReason ? (
                'Use model'
              ) : (
                <Link
                  href={{
                    pathname: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/build/configure/${configureSegment}/${record.id}`,
                    query: {
                      [WORKFLOW_SESSION_ID_SEARCH_PARAM]: createWorkflowSessionId(),
                      [PanelQueryParam]: WorkflowSimulatePanels.Configuration,
                    },
                  }}
                >
                  Use model
                </Link>
              )}
            </Button>
          </WorkflowBlockedActionTooltip>
        ))}
    </div>
  );
}
