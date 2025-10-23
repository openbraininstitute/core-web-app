import { useMemo, useState } from 'react';
import { match, P } from 'ts-pattern';
import { Pagination } from 'antd';

import Link from 'next/link';
import isString from 'es-toolkit/compat/isString';

import type { ColumnsType } from 'antd/es/table';

import { useElectricalCellRecordingsByDerivations, useEmodelDerivations } from '@/ui/hooks/data';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getFieldsDefinition } from '@/entity-configuration/definitions';
import { Header } from '@/features/entities/e-model/detail-view/header';
import { ErrorData } from '@/components/message-banners/error';
import { BaseTable } from '@/ui/segments/data-table/table';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { DEFAULT_PAGE_XSMALL_SIZE } from '@/constants';

import type {
  EntityCoreObjectTypes,
  IElectricalCellRecording,
  IEModel,
} from '@/api/entitycore/types';

const defaultColumnsFields = getFieldsDefinition([
  EntityCoreFields.Preview,
  EntityCoreFields.Name,
  EntityCoreFields.MType,
  EntityCoreFields.EType,
  EntityCoreFields.Species,
]);

function makeColumns(
  virtualLabId: string,
  projectId: string
): ColumnsType<IElectricalCellRecording> {
  return Object.entries(defaultColumnsFields).map(([key, field]) => ({
    title: isString(field.title) ? field.title.toUpperCase() : field.title,
    key,
    render: (entity: EntityCoreObjectTypes) => {
      const href = `/app/virtual-lab/${virtualLabId}/${projectId}/data/view/electrical-cell-recording/${
        entity.id
      }/overview`;
      return <Link href={href}>{field.render?.(entity)}</Link>;
    },
  }));
}

type Props = {
  source: IEModel;
};

export function ExemplarTraces({ source }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const [{ pageNumber, pageSize }, updatePageState] = useState({
    pageNumber: 1,
    pageSize: DEFAULT_PAGE_XSMALL_SIZE,
  });

  const { derivations, error, isLoading, isSuccessDerivations } = useEmodelDerivations({
    entityId: source.id,
    virtualLabId,
    projectId,
    pageNumber,
    pageSize,
  });

  const { eModelExemplarTraces, errorExemplarTraces, isLoadingExemplarTraces } =
    useElectricalCellRecordingsByDerivations({
      virtualLabId,
      projectId,
      enabled: isSuccessDerivations ? !!(derivations!.pagination.total_items > 0) : false,
      Ids: derivations?.data.map((p) => p.id) || [],
    });

  const total = derivations?.pagination.total_items;
  const columns: ColumnsType<IElectricalCellRecording> = useMemo(
    () => makeColumns(virtualLabId, projectId),
    [virtualLabId, projectId]
  );

  const content = match({
    isLoading,
    isLoadingExemplarTraces,
    error,
    errorExemplarTraces,
    eModelExemplarTraces,
  })
    .with(
      P.union(
        { isLoading: true, isLoadingExemplarTraces: P._ },
        { isLoading: P._, isLoadingExemplarTraces: true }
      ),
      () => (
        <div className="mx-auto mt-4 w-full">
          <div className="animate-pulse">
            {Array.from({ length: 5 }, (_, i) => i).map((value) => (
              <div
                key={`row-ske-${value}`}
                className="flex h-[132px] w-full items-center gap-x-6 border-b border-gray-300 py-8"
              >
                <div className="flex w-[330px] items-center justify-start">
                  <div className="h-[116px] w-[184px] rounded-md bg-gray-200" />
                </div>
                <div className="h-8 flex-1 rounded-md bg-gray-200" />
                <div className="h-8 flex-1 rounded-md bg-gray-200" />
                <div className="h-8 flex-1 rounded-md bg-gray-200" />
                <div className="h-8 flex-1 rounded-md bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      )
    )
    .with(
      P.union(
        { error: P.nonNullable, errorExemplarTraces: P._ },
        { errorExemplarTraces: P.nonNullable, error: P._ }
      ),
      () => {
        return (
          <ErrorData
            title="No exemplar traces found"
            description="No exemplar traces found for this e-model"
            cls={{
              container: 'bg-white text-primary-9 border-primary-9! w-full! max-w-full!',
              title: 'text-primary-9',
              description: 'text-primary-9',
            }}
          />
        );
      }
    )
    .with(
      {
        isLoading: P.boolean.and(false),
        isLoadingExemplarTraces: P.boolean.and(false),
        error: P.nullish,
        errorExemplarTraces: P.nullish,
        eModelExemplarTraces: P.nonNullable.select('result'),
      },
      ({ result }) => {
        return (
          <BaseTable
            size="small"
            wrapperClassname="h-full min-h-max "
            className="h-full [&_.ant-table-body]:max-h-full!"
            dataType={ExtendedEntitiesTypeDict.ElectricalCellRecording}
            dataSource={result.data}
            rowKey="id"
            columns={columns}
            rowClassName="[&:last-child>td]:border-b-0!"
            scroll={{
              x: true,
            }}
          />
        );
      }
    )
    .otherwise(() => null);

  return (
    <>
      <Header>Exemplar Traces</Header>
      <Pagination
        simple
        responsive
        hideOnSinglePage
        defaultPageSize={DEFAULT_PAGE_XSMALL_SIZE}
        total={total}
        pageSize={pageSize}
        current={pageNumber}
        defaultCurrent={1}
        align="end"
        size="default"
        role="button"
        onChange={(_page, _pageSize) => {
          updatePageState({
            pageNumber: _page,
            pageSize: _pageSize,
          });
        }}
      />
      {content}
    </>
  );
}
