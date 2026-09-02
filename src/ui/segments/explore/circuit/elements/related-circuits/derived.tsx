import { snakeCase } from 'es-toolkit/compat';
import { useParams, useRouter } from 'next/navigation';

import { getCircuitDerivationLabel } from '@/api/entitycore/types/entities/derivation';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { CircuitRecursiveGrid } from '@/ui/segments/explore/circuit/elements/circuit-recursive-grid';
import { RELATED_CIRCUIT_COLUMNS } from '@/ui/segments/explore/circuit/elements/related-circuits/columns';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { DerivedGroup } from '@/ui/segments/explore/circuit/use-hierarchy';
import type { KebabCase } from '@/utils/type';

type Props = {
  groups: DerivedGroup[];
};

/**
 * One grid per derivation type. Each row is the current circuit; its expander holds that
 * type's derived circuits, so the derivation label names the expander rather than the table.
 */
export function Derived({ groups }: Props) {
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
    <div className="flex flex-col gap-5">
      {groups.map(({ derivationType, circuits }) => (
        <CircuitRecursiveGrid
          key={derivationType}
          gridId={`derived-${derivationType}`}
          simpleColumns={RELATED_CIRCUIT_COLUMNS}
          expandColumnId={EntityCoreFields.CircuitSubCircuit}
          expandLabel={getCircuitDerivationLabel(derivationType)}
          dataType={dataType}
          circuits={circuits}
          onCellClick={onCellClick}
        />
      ))}
    </div>
  );
}
