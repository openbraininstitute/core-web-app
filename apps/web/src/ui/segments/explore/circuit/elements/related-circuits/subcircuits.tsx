import { useRouter } from 'next/navigation';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { CircuitRecursiveGrid } from '@/ui/segments/explore/circuit/elements/circuit-recursive-grid';
import { RELATED_CIRCUIT_COLUMNS } from '@/ui/segments/explore/circuit/elements/related-circuits/columns';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { HierarchyOutputNode } from '@/ui/segments/explore/circuit/helpers';

type Props = {
  data: HierarchyOutputNode[] | undefined;
};

export function Subcircuits({ data }: Props) {
  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = useWorkspace();

  const onCellClick = (_basePath: string, record: ICircuit) => {
    navigate(
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        dataType: ExtendedEntitiesTypeDict.Circuit,
        entityId: record.id,
      })
    );
  };

  return (
    <CircuitRecursiveGrid
      simpleColumns={RELATED_CIRCUIT_COLUMNS}
      expandColumnId={EntityCoreFields.CircuitSubCircuit}
      dataType={ExtendedEntitiesTypeDict.Circuit}
      circuits={data}
      onCellClick={onCellClick}
    />
  );
}
