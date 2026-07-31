import { snakeCase } from 'es-toolkit/compat';
import { useParams, useRouter } from 'next/navigation';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { CircuitRecursiveGrid } from '@/ui/segments/explore/circuit/elements/circuit-recursive-grid';
import { RELATED_CIRCUIT_COLUMNS } from '@/ui/segments/explore/circuit/elements/related-circuits/columns';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { HierarchyOutputNode } from '@/ui/segments/explore/circuit/helpers';
import type { KebabCase } from '@/utils/type';

type Props = {
  data: HierarchyOutputNode[] | undefined;
};

export function Derived({ data }: Props) {
  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = useWorkspace();
  const { type } = useParams<{ type: KebabCase<TExtendedEntitiesTypeDict> }>();
  const dataType = snakeCase(type) as TExtendedEntitiesTypeDict;

  const onCellClick = (_basePath: string, record: ICircuit) => {
    navigate(
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        dataType,
        entityId: record.id,
      })
    );
  };

  return (
    <CircuitRecursiveGrid
      simpleColumns={RELATED_CIRCUIT_COLUMNS}
      expandColumnId={EntityCoreFields.CircuitSubCircuit}
      dataType={dataType}
      circuits={data}
      onCellClick={onCellClick}
    />
  );
}
