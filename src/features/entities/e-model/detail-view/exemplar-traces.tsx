import isString from 'es-toolkit/compat/isString';
import kebabCase from 'es-toolkit/compat/kebabCase';
import Link from 'next/link';
import { useMemo } from 'react';

import { getElectricalCellRecordings } from '@/api/entitycore/queries';
import { getEntityDerivations } from '@/api/entitycore/queries/general/derivation';
import { EntityTypeDict } from '@/api/entitycore/types';
import { DerivationTypeDictionary } from '@/api/entitycore/types/entities/derivation';
import { DEFAULT_PAGE_XSMALL_SIZE, type TViewVariant, ViewVariant } from '@/constants';
import { getFieldsDefinition } from '@/entity-configuration/definitions';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { Header } from '@/features/entities/e-model/detail-view/header';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { detailViewInsetPanelClass } from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type {
  EntityCoreObjectTypes,
  IElectricalCellRecording,
  IEModel,
  TEntityTypeDict,
} from '@/api/entitycore/types';
import type { GridDataSource, GridPage } from '@/features/data-grid/core';
import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { NormalizeChars } from '@/utils/type';

const defaultColumnsFields = getFieldsDefinition([
  EntityCoreFields.Preview,
  EntityCoreFields.Name,
  EntityCoreFields.MType,
  EntityCoreFields.EType,
  EntityCoreFields.SpeciesName,
]);

function makeColumns(
  virtualLabId: string,
  projectId: string
): Array<SimpleColumn<IElectricalCellRecording>> {
  return Object.entries(defaultColumnsFields).map(([key, field]) => ({
    id: key,
    header: isString(field.title) ? field.title.toUpperCase() : key,
    headerNode: isString(field.title) ? undefined : field.title,
    renderCell: (entity) => {
      const href = `/app/virtual-lab/${virtualLabId}/${projectId}/data/view/electrical-cell-recording/${
        entity.id
      }/overview`;
      return <Link href={href}>{field.render?.(entity as EntityCoreObjectTypes)}</Link>;
    },
  }));
}

type Props = {
  source: IEModel;
  variant?: TViewVariant;
};

export function ExemplarTraces({ source, variant = ViewVariant.Light }: Props) {
  const { virtualLabId, projectId } = useWorkspace();

  const columns = useMemo(() => makeColumns(virtualLabId, projectId), [virtualLabId, projectId]);

  // Server data source: mirrors the legacy two-step paginated fetch — page the
  // e-model derivations (`total_items` drives the pager), then resolve the matching
  // electrical-cell recordings for the current page's ids. SimpleGrid owns paging.
  const dataSource = useMemo<GridDataSource<IElectricalCellRecording>>(
    () => ({
      fetch: async (query): Promise<GridPage<IElectricalCellRecording>> => {
        const derivations = await getEntityDerivations({
          context: { virtualLabId, projectId },
          entityRoute: kebabCase(EntityTypeDict.Emodel) as NormalizeChars<TEntityTypeDict>,
          entityId: source.id,
          filters: {
            derivation_type: DerivationTypeDictionary.Unspecified,
            page: query.page,
            page_size: query.pageSize,
          },
        });
        const total = derivations.pagination.total_items;
        const ids = derivations.data.map((p) => p.id);
        if (total <= 0 || ids.length === 0) return { rows: [], total };
        const recordings = await getElectricalCellRecordings({
          context: { virtualLabId, projectId },
          filters: { id__in: ids },
          withFacets: false,
        });
        return { rows: recordings.data, total };
      },
    }),
    [virtualLabId, projectId, source.id]
  );

  return (
    <div className="flex flex-col gap-4">
      <Header variant={variant}>Exemplar Traces</Header>
      <div className={cn(detailViewInsetPanelClass(variant))}>
        <SimpleGrid<IElectricalCellRecording>
          columns={columns}
          getRowId={(row) => row.id}
          pageSize={DEFAULT_PAGE_XSMALL_SIZE}
          serverSide={{
            dataSource,
            queryKey: ['emodel-exemplar-traces', virtualLabId, projectId, source.id],
          }}
        />
      </div>
    </div>
  );
}
