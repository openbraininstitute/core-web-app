import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { unwrap } from 'jotai/utils';
import { useAtomValue } from 'jotai';

import useExploreColumns from '@/hooks/useExploreColumns';

import { BaseTable } from '@/components/explore-section/ExploreSectionListingView/ExploreSectionTable';
import { getEntityDerivations } from '@/api/entitycore/queries/general/derivation';
import { activeColumnsAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { getCircuits } from '@/api/entitycore/queries/model/circuit';
import { Error } from '@/features/entities/circuit/elements/error';
import { DataType } from '@/constants/explore-section/list-views';
import { EntityTypeEnum } from '@/api/entitycore/types';
import { tryCatch } from '@/api/utils';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  circuit: ICircuit;
};

export default function Parent({ circuit }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const [parentCircuits, setParentCircuits] = useState<{
    loading: boolean;
    error: string | null;
    records: ICircuit[];
  }>({
    loading: false,
    error: null,
    records: [],
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
    setParentCircuits((prev) => ({
      ...prev,
      loading: true,
    }));

    async function getParent() {
      const { data, error } = await tryCatch(
        getEntityDerivations({
          entityRoute: EntityTypeEnum.Circuit,
          entityId: circuit.id,
          filters: { type: EntityTypeEnum.Circuit },
          context: { virtualLabId, projectId },
        })
      );
      if (error) {
        setParentCircuits({
          loading: false,
          error: error.message ?? 'Failed to get parent circuits derivation',
          records: [],
        });
        return;
      }
      if (!data?.pagination.total_items) {
        setParentCircuits({
          loading: false,
          error: 'No derivation found for this circuit',
          records: [],
        });
        return;
      }
      if (data && data.data.length > 0) {
        const { data: circuits, error: circuitError } = await tryCatch(
          getCircuits({
            filters: {
              id__in: data.data.map((d) => d.id),
            },
            context: { virtualLabId, projectId },
          })
        );
        if (circuitError) {
          setParentCircuits({
            loading: false,
            error: circuitError.message ?? 'Failed to get parent circuits',
            records: [],
          });
          return;
        }
        if (!circuits?.pagination.total_items) {
          setParentCircuits({
            loading: false,
            error: 'No parent circuit found for this derivation',
            records: [],
          });
          return;
        }
        if (circuits && circuits.data.length > 0) {
          setParentCircuits({
            loading: false,
            error: null,
            records: circuits.data,
          });
        }
      }
    }

    getParent();
  }, [circuit.id, virtualLabId, projectId]);

  if (parentCircuits.error) {
    return (
      <div className="flex w-full items-center justify-center">
        <Error
          title="Error"
          icon={null}
          description={parentCircuits.error}
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
      loading={parentCircuits.loading}
      columns={columns}
      dataContext={{
        dataScope: ExploreDataScope.NoScope,
        virtualLabInfo: undefined,
        dataType: DataType.Circuit,
      }}
      dataSource={parentCircuits.records}
    />
  );
}
