import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { unwrap } from 'jotai/utils';
import { useAtomValue } from 'jotai';

import useExploreColumns from '@/hooks/useExploreColumns';
import { BaseTable } from '@/components/explore-section/ExploreSectionListingView/ExploreSectionTable';
import { activeColumnsAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { DataType } from '@/constants/explore-section/list-views';
import { tryCatch } from '@/api/utils';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  circuit: ICircuit;
};

export default function Parent({ circuit }: Props) {
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
  const cols = useExploreColumns<ICircuit>(undefined, undefined, [], DataType.Circuit);
  const activeColumns = useAtomValue(
    useMemo(
      () =>
        unwrap(
          activeColumnsAtom({
            dataType: DataType.Circuit,
            dataScope: ExploreDataScope.NoScope,
            brainRegionId: undefined,
            key: circuit.id,
          })
        ),
      [circuit.id]
    )
  );
  const columns = cols.filter(({ key }) => (activeColumns || []).includes(key as string));

  useEffect(() => {
    async function getRoot() {
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
    }

    getRoot();
  }, [circuit.root_circuit_id, virtualLabId, projectId]);

  return (
    <BaseTable
      loading={rootCircuit.loading}
      columns={columns}
      dataContext={{
        dataScope: ExploreDataScope.NoScope,
        virtualLabInfo: undefined,
        dataType: DataType.Circuit,
      }}
      dataSource={rootCircuit.record ? [rootCircuit.record] : []}
    />
  );
}
