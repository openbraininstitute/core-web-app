import { kebabCase } from 'es-toolkit/compat';
import Link from 'next/link';

import { type EntityCoreObjectTypes, EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { type TWorkspaceSection, WorkflowActivityDictValue, WorkspaceSection } from '@/constants';
import { resolveSimulateConfigureSegment } from '@/features/scan-config/workflow/resolve-configure-segment';
import { createWorkflowSessionId } from '@/features/scan-config/workflow/session';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { WORKFLOW_SESSION_ID_SEARCH_PARAM } from '@/ui/segments/workflows/config';
import { WorkflowUseModelButton } from '@/ui/segments/workflows/elements/use-model-button';
import {
  PanelQueryParam,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config/types';

function activityFromSection(section: TWorkspaceSection): TActivityValue | null {
  if (section === WorkspaceSection.SimulateWorkflow) {
    return WorkflowActivityDictValue.simulate;
  }
  if (section === WorkspaceSection.ExtractWorkflow) {
    return WorkflowActivityDictValue.extract;
  }
  if (section === WorkspaceSection.ProcessWorkflow) {
    return WorkflowActivityDictValue.process;
  }
  return null;
}

export function WorkflowActions<T extends EntityCoreObjectTypes>({
  section,
  record,
  dataType,
  hideUseModelAction,
  workflowTargetType,
}: {
  section: TWorkspaceSection;
  record: T;
  dataType?: TExtendedEntitiesTypeDict;
  hideUseModelAction?: boolean;
  workflowTargetType?: TExtendedEntitiesTypeDict;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const activity = activityFromSection(section);

  let detailUrl = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(record.type)}/${record.id}`;

  if (
    record.type === EntityTypeDict.Circuit &&
    (record as ICircuit).scale === CircuitScaleDictionary.Single
  ) {
    detailUrl = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(ExtendedEntitiesTypeDict.MEModelWithSynapses)}/${record.id}`;
  }

  const configureSegment = resolveSimulateConfigureSegment({
    section,
    recordType: record.type,
    dataType,
  });

  const useModelQuery = {
    [PanelQueryParam]: WorkflowSimulatePanels.Configuration,
  };

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
        (workflowTargetType && activity ? (
          <WorkflowUseModelButton
            variant="default"
            activity={activity}
            targetType={workflowTargetType}
            entityId={record.id}
            entityType={dataType ?? (record.type as TExtendedEntitiesTypeDict)}
            query={useModelQuery}
            rounded
            title="Start simulation"
            className="hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
          >
            Use model
          </WorkflowUseModelButton>
        ) : (
          <Button
            rounded
            asChild
            title="Start simulation"
            variant="default"
            className="hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
          >
            <Link
              href={{
                pathname: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/${section}/configure/${configureSegment}/${record.id}`,
                query: {
                  [WORKFLOW_SESSION_ID_SEARCH_PARAM]: createWorkflowSessionId(),
                  ...useModelQuery,
                },
              }}
            >
              Use model
            </Link>
          </Button>
        ))}
    </div>
  );
}
