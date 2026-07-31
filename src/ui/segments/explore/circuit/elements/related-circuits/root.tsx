import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { tryCatch } from '@/api/utils';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { CircuitRecursiveGrid } from '@/ui/segments/explore/circuit/elements/circuit-recursive-grid';
// biome-ignore lint/suspicious/noShadowRestrictedNames: `Error` is an existing local component export used across circuit tables.
import { Error } from '@/ui/segments/explore/circuit/elements/error';
import { RELATED_CIRCUIT_COLUMNS } from '@/ui/segments/explore/circuit/elements/related-circuits/columns';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  circuit: ICircuit;
};

export function Root({ circuit }: Props) {
  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const [rootCircuit, setRootCircuit] = useState<{
    loading: boolean;
    error: string | null;
    record: ICircuit | null;
  }>({
    loading: false,
    error: null,
    record: null,
  });

  const onCellClick = (_basePath: string, record: ICircuit) => {
    navigate(
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        dataType: ExtendedEntitiesTypeDict.Circuit,
        entityId: record.id,
      })
    );
  };

  useEffect(() => {
    async function getRoot() {
      setRootCircuit((prev) => ({ ...prev, error: null, loading: true }));
      if (circuit.root_circuit_id) {
        const { data: result, error } = await tryCatch(
          getCircuit({
            id: circuit.root_circuit_id,
            context: { virtualLabId, projectId },
          })
        );
        if (result) {
          setRootCircuit({
            loading: false,
            error: null,
            record: result,
          });
          return;
        }
        if (error) {
          setRootCircuit({
            loading: false,
            error: error.message ?? 'Failed to get root circuit',
            record: null,
          });
        }
      } else {
        setRootCircuit(() => ({
          record: null,
          error: null,
          loading: false,
        }));
      }
    }

    getRoot();
  }, [circuit.root_circuit_id, virtualLabId, projectId]);

  if (rootCircuit.error) {
    return (
      <div className="flex w-full items-center justify-center">
        <Error
          title="Error"
          icon={null}
          description={rootCircuit.error}
          cls={{
            container: 'text-primary-8! max-w-2xl w-full shadow-xs p-4!',
            title: 'capitalize!',
            description: 'text-primary-8!',
          }}
        />
      </div>
    );
  }

  return (
    <CircuitRecursiveGrid
      loading={rootCircuit.loading}
      simpleColumns={RELATED_CIRCUIT_COLUMNS}
      expandColumnId={EntityCoreFields.CircuitSubCircuit}
      dataType={ExtendedEntitiesTypeDict.Circuit}
      circuits={rootCircuit.record ? [rootCircuit.record] : []}
      onCellClick={onCellClick}
    />
  );
}
