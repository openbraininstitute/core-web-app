import isString from 'es-toolkit/compat/isString';
import kebabCase from 'es-toolkit/compat/kebabCase';
import { useEffect, useMemo } from 'react';

import { getElectricalCellRecordings } from '@/api/entitycore/queries';
import { getEntityDerivations } from '@/api/entitycore/queries/general/derivation';
import { EntityTypeDict } from '@/api/entitycore/types';
import { DerivationTypeDictionary } from '@/api/entitycore/types/entities/derivation';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { isNotAuthorizedError } from '@/api/error';
import { ErrorData } from '@/components/message-banners/error';
import { DEFAULT_PAGE_XSMALL_SIZE, type TViewVariant, ViewVariant } from '@/constants';
import { getFieldsDefinition } from '@/entity-configuration/definitions';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { Header } from '@/features/entities/e-model/detail-view/header';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  detailViewInsetPanelClass,
  detailViewPaginationClass,
} from '@/ui/segments/detail-view/variant-styles';
import { MiniDetailView } from '@/ui/segments/mini-detail-view';
import {
  makeSelectEntityClickEvent,
  useMiniDetailView,
  useSelectEntityClickEvent,
} from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';
import { isProjectPrivateRecord } from '@/utils/workspace-scope';

import type {
  EntityCoreObjectTypes,
  IElectricalCellRecording,
  IEModel,
  TEntityTypeDict,
} from '@/api/entitycore/types';
import type { IGridDataSource, IGridPage } from '@/features/data-grid/core';
import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { NormalizeChars } from '@/utils/type';

/**
 * A failed fetch is not an empty listing: reporting every error as "no traces" hides a
 * permission problem behind a wording the user cannot act on.
 */
function describeTracesError(error: unknown): {
  title: string;
  description: string;
} {
  if (isNotAuthorizedError(error)) {
    return {
      title: 'No access to exemplar traces',
      description: "You don't have permission to view the recordings behind this e-model.",
    };
  }
  return {
    title: 'Could not load exemplar traces',
    description: 'Something went wrong while fetching them. Please try again.',
  };
}

const defaultColumnsFields = getFieldsDefinition([
  EntityCoreFields.Preview,
  EntityCoreFields.Name,
  EntityCoreFields.MType,
  EntityCoreFields.EType,
  EntityCoreFields.SpeciesName,
]);

function makeColumns(): Array<ISimpleColumn<IElectricalCellRecording>> {
  return Object.entries(defaultColumnsFields).map(([key, field]) => ({
    id: key,
    header: isString(field.title) ? field.title.toUpperCase() : key,
    headerNode: isString(field.title) ? undefined : field.title,
    // The table supplies a fixed preview row height so custom renderers cannot collapse it.
    renderCell: (entity) => field.render?.(entity as EntityCoreObjectTypes),
  }));
}

const columns = makeColumns();

type Props = {
  source: IEModel;
  variant?: TViewVariant;
};

export function ExemplarTraces({ source, variant = ViewVariant.Light }: Props) {
  const { virtualLabId, projectId } = useWorkspace();

  // Mirrors EntityDataGrid's own click-to-mini-detail-view wiring, so a row here
  // opens the same side panel (with its "View details" link) as the main listings.
  const { mdv, setMdv } = useMiniDetailView();
  useSelectEntityClickEvent<IElectricalCellRecording>((event) => {
    setMdv(event.detail.display);
  });
  useEffect(() => {
    setMdv(false);
    return () => {
      makeSelectEntityClickEvent({ display: false, data: null });
      setMdv(false);
    };
  }, [setMdv]);

  // Server data source: mirrors the legacy two-step paginated fetch — page the
  // e-model derivations (`total_items` drives the pager), then resolve the matching
  // electrical-cell recordings for the current page's ids. SimpleGrid owns paging.
  const dataSource = useMemo<IGridDataSource<IElectricalCellRecording>>(
    () => ({
      fetch: async (query): Promise<IGridPage<IElectricalCellRecording>> => {
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
          // Explicit: entitycore's default of 10 would truncate a larger page of ids.
          filters: { id__in: ids, page_size: ids.length },
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
      <div
        className={cn('grid gap-2', {
          "grid-cols-[minmax(0,1fr)_minmax(30rem,44rem)] [grid-template-areas:'body_mini-view']":
            mdv,
          "grid-cols-1 [grid-template-areas:'body']": !mdv,
        })}
      >
        <div className={cn(detailViewInsetPanelClass(variant), '[grid-area:body]')}>
          <SimpleGrid<IElectricalCellRecording>
            columns={columns}
            rowHeight={118}
            className={detailViewPaginationClass(variant)}
            getRowId={(row) => row.id}
            pageSize={DEFAULT_PAGE_XSMALL_SIZE}
            onRowClick={(row) => makeSelectEntityClickEvent({ display: true, data: row })}
            serverSide={{
              dataSource,
              queryKey: ['emodel-exemplar-traces', virtualLabId, projectId, source.id],
              renderError: (error, { hasRows }) => {
                const { title, description } = describeTracesError(error);
                return (
                  <ErrorData
                    title={title}
                    description={hasRows ? undefined : description}
                    cls={{
                      container: 'bg-white text-primary-9 border-primary-9! w-full! max-w-full!',
                      title: 'text-primary-9',
                      description: 'text-primary-9',
                    }}
                  />
                );
              },
            }}
          />
        </div>
        <div className={cn('[grid-area:mini-view]', { hidden: !mdv })}>
          <MiniDetailView
            dataType={ExtendedEntitiesTypeDict.ElectricalCellRecording}
            isPrivate={(record) => isProjectPrivateRecord(record, projectId)}
          />
        </div>
      </div>
    </div>
  );
}
