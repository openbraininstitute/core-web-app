import { kebabCase } from 'es-toolkit/compat';
import Link from 'next/link';

import { type EntityCoreObjectTypes, EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { getWorkflow } from '@/ui/segments/workflows/config';
import { WorkflowConfigureUseModelLink } from '@/ui/segments/workflows/elements/workflow-link';
import {
  PanelQueryParam,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceSection } from '@/constants';
import type { TActivityValue } from '@/ui/segments/workflows/config/types';

function resolveConfigureEntityType<T extends EntityCoreObjectTypes>(
  record: T,
  dataType?: TExtendedEntitiesTypeDict
): TExtendedEntitiesTypeDict {
  if (dataType) {
    return dataType;
  }

  if (
    record.type === EntityTypeDict.Circuit &&
    (record as ICircuit).scale === CircuitScaleDictionary.Single
  ) {
    return ExtendedEntitiesTypeDict.MEModelWithSynapses;
  }

  return record.type as TExtendedEntitiesTypeDict;
}

const modelButtonClassName =
  'hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]';

export function WorkflowActions<T extends EntityCoreObjectTypes>({
  section,
  record,
  dataType,
  workflowTargetType,
  hideUseModelAction = false,
}: {
  section: TWorkspaceSection;
  record: T;
  dataType?: TExtendedEntitiesTypeDict;
  /** campaign target type for scan-config configure URLs (browse page `targetType`) */
  workflowTargetType?: TExtendedEntitiesTypeDict;
  hideUseModelAction?: boolean;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const activity = section as TActivityValue;

  let detailUrl = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(record.type)}/${record.id}`;

  if (
    record.type === EntityTypeDict.Circuit &&
    (record as ICircuit).scale === CircuitScaleDictionary.Single
  ) {
    detailUrl = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(ExtendedEntitiesTypeDict.MEModelWithSynapses)}/${record.id}`;
  }

  const configureEntityType = resolveConfigureEntityType(record, dataType);

  const workflow = getWorkflow({
    activity,
    targetType: workflowTargetType,
    sourceType: workflowTargetType ? undefined : configureEntityType,
  });

  const targetType = workflowTargetType ?? workflow?.targetType;

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
        className={modelButtonClassName}
      >
        <Link href={detailUrl}>View details</Link>
      </Button>
      {!hideUseModelAction && (
        <WorkflowConfigureUseModelLink
          rounded
          title="Start simulation"
          variant="default"
          className={modelButtonClassName}
          activity={activity}
          targetType={targetType}
          entityType={configureEntityType}
          entityId={record.id}
          query={{
            [PanelQueryParam]: WorkflowSimulatePanels.Configuration,
            ...(dataType ? { dataType } : {}),
          }}
        >
          Use model
        </WorkflowConfigureUseModelLink>
      )}
    </div>
  );
}
