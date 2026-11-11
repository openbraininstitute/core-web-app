'use client';

import { useParams, useRouter } from 'next/navigation';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { CircuitRecursiveGrid } from '@/ui/segments/explore/circuit/elements/circuit-recursive-grid';
import { RELATED_CIRCUIT_COLUMNS } from '@/ui/segments/explore/circuit/elements/related-circuits/columns';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  data: ICircuit | undefined;
};

export function Parent({ data }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const { push: navigate } = useRouter();

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
      onCellClick={onCellClick}
      circuits={data ? [data] : []}
    />
  );
}
