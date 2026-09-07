'use client';

import { useParams, useRouter } from 'next/navigation';

import { getCircuitDerivationLabel } from '@/api/entitycore/types/entities/derivation';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { CircuitRecursiveGrid } from '@/ui/segments/explore/circuit/elements/circuit-recursive-grid';
import { RELATED_CIRCUIT_COLUMNS } from '@/ui/segments/explore/circuit/elements/related-circuits/columns';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';
import type { DerivedFromGroup } from '@/ui/segments/explore/circuit/use-hierarchy';

type Props = {
  groups: DerivedFromGroup[];
};

/**
 * One labelled section per derivation type, each holding that type's source circuit. These rows
 * are never enriched with a subtree, so there is no expander here to carry the label.
 */
export function DerivedFrom({ groups }: Props) {
  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();

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
    <div className="flex flex-col gap-5">
      {groups.map(({ derivationType, circuit }) => (
        <div key={derivationType} className="flex flex-col gap-2">
          <div className="ml-2 flex flex-row items-center gap-2">
            <ArrowReturnRight className="text-neutral-3 text-3xl" />
            <div className="text-neutral-3 text-lg font-semibold uppercase">
              {getCircuitDerivationLabel(derivationType)}
            </div>
          </div>
          <CircuitRecursiveGrid
            gridId={`derived-from-${derivationType}`}
            simpleColumns={RELATED_CIRCUIT_COLUMNS}
            expandColumnId={EntityCoreFields.CircuitSubCircuit}
            dataType={ExtendedEntitiesTypeDict.Circuit}
            circuits={[circuit]}
            onCellClick={onCellClick}
          />
        </div>
      ))}
    </div>
  );
}
