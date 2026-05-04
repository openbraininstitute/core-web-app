import { kebabCase } from 'es-toolkit/compat';
import Link from 'next/link';

import { type EntityCoreObjectTypes, EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import {
  PanelQueryParam,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceSection } from '@/constants';

export function WorkflowActions<T extends EntityCoreObjectTypes>({
  section,
  record,
  dataType,
}: {
  section: TWorkspaceSection;
  record: T;
  dataType?: TExtendedEntitiesTypeDict;
}) {
  const { virtualLabId, projectId } = useWorkspace();

  let detailUrl = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(record.type)}/${record.id}`;

  if (
    record.type === EntityTypeDict.Circuit &&
    (record as ICircuit).scale === CircuitScaleDictionary.Single
  ) {
    detailUrl = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(ExtendedEntitiesTypeDict.MEModelWithSynapses)}/${record.id}`;
  }

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
      <Button
        rounded
        asChild
        title="Start simulation"
        variant="default"
        className="hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
      >
        <Link
          href={{
            pathname: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/${section}/configure/${kebabCase(record.type)}/${record.id}`,
            query: {
              sessionId: crypto.randomUUID(),
              [PanelQueryParam]: WorkflowSimulatePanels.Configuration,
              dataType,
            },
          }}
        >
          Use model
        </Link>
      </Button>
    </div>
  );
}
