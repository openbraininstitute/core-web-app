import { useRouter, useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { unwrap } from 'jotai/utils';
import { useAtomValue } from 'jotai';

import { useDataTableColumns } from '@/ui/segments/data-table/elements/use-data-table-columns';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { activeColumnsAtom } from '@/ui/segments/data-table/elements/context';
import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { Error } from '@/ui/segments/explore/circuit/elements/error';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { BaseTable } from '@/ui/segments/data-table/table';
import { WorkspaceScope } from '@/constants';
import { tryCatch } from '@/api/utils';

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

  const cols = useDataTableColumns<ICircuit>({
    dataType: ExtendedEntitiesTypeDict.Circuit,
    setSortState: undefined,
    sortState: undefined,
    initialColumns: [],
  });

  const activeColumns = useAtomValue(
    useMemo(
      () =>
        unwrap(
          activeColumnsAtom({
            dataType: ExtendedEntitiesTypeDict.Circuit,
            dataScope: WorkspaceScope.Custom,
            key: circuit.id,
          })
        ),
      [circuit.id]
    )
  );
  const columns = cols.filter(({ key }) => (activeColumns || []).includes(key as string));

  const onCellClick = (basePath: string, record: ICircuit) => {
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
    <BaseTable
      loading={rootCircuit.loading}
      columns={columns}
      dataType={ExtendedEntitiesTypeDict.Circuit}
      dataSource={rootCircuit.record ? [rootCircuit.record] : []}
      onCellClick={onCellClick}
      wrapperClassname="[&_.ant-table-body]:max-h-full!"
    />
  );
}
