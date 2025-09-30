import Link from 'next/link';
import { useAtom, useAtomValue } from 'jotai';
import { Pagination } from 'antd';
import React, { Suspense } from 'react';
import isString from 'lodash/isString';

import type { ColumnsType } from 'antd/es/table';

import DefaultEModelTable from '@/components/build-section/cell-model-assignment/e-model/EModelView/DefaultEModelTable';
import ErrorData from '@/components/message-banners/error';

import { ElectricalCellRecording } from '@/entity-configuration/domain/experimental/electrical-cell-recording';
import { pageNumberAtom, pageSizeAtom } from '@/state/explore-section/list-view-atoms';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { getFieldsDefinition } from '@/entity-configuration/definitions';
import { experimentalTracesAtomFamily } from '@/state/e-model';
import { resolveDataKey } from '@/utils/key-builder';
import { useUnwrappedValue } from '@/hooks/hooks';

import type {
  EntityCoreObjectTypes,
  IElectricalCellRecording,
  IEModel,
} from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';
import { useWorkspace } from '@/ui/hooks/use-workspace';

const defaultPageSize = 5;
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
  params: WorkspaceContext & { id: string };
};

function ExemplarTraces({ params, source }: Props) {
  const key = resolveDataKey({
    section: 'explore',
    projectId: params.projectId,
    entity: ElectricalCellRecording,
    suffix: 'exemplar-traces',
  });

  const eModelExemplarTraces = useAtomValue(
    experimentalTracesAtomFamily({
      key,
      id: source.id,
      projectId: params.projectId,
      virtualLabId: params.virtualLabId,
    })
  );
  const { virtualLabId, projectId } = useWorkspace();
  const columns: ColumnsType<IElectricalCellRecording> = React.useMemo(
    () => makeColumns(virtualLabId, projectId),
    [virtualLabId, projectId]
  );

  return (
    <>
      {eModelExemplarTraces?.data?.length ? (
        <DefaultEModelTable<IElectricalCellRecording>
          key="exemplar-traces"
          dataSource={eModelExemplarTraces.data}
          columns={columns}
        />
      ) : (
        <ErrorData
          title="No exemplar traces found"
          description="No exemplar traces found for this e-model"
          cls={{
            container: 'bg-white text-primary-9 border-primary-9! w-full! max-w-full!',
            title: 'text-primary-9',
            description: 'text-primary-9',
          }}
        />
      )}
    </>
  );
}
export default function Wrapper({ params, source }: Props) {
  const key = resolveDataKey({
    section: 'explore',
    projectId: params.projectId,
    entity: ElectricalCellRecording,
    suffix: 'exemplar-traces',
  });

  const [pageNumber, updatePageNumber] = useAtom(pageNumberAtom(key));
  const [pageSize, updatePageSize] = useAtom(pageSizeAtom({ key, defaultSize: defaultPageSize }));
  const eModelExemplarTraces = useUnwrappedValue(
    experimentalTracesAtomFamily({
      key,
      id: source.id,
      projectId: params.projectId,
      virtualLabId: params.virtualLabId,
    })
  );
  return (
    <>
      <div className="text-primary-8 text-2xl font-bold">Exemplar Traces</div>
      <Pagination
        simple
        responsive
        hideOnSinglePage
        defaultPageSize={defaultPageSize}
        total={eModelExemplarTraces?.total}
        pageSize={pageSize}
        current={pageNumber}
        defaultCurrent={1}
        align="end"
        size="default"
        role="button"
        onChange={(_page, _pageSize) => {
          updatePageNumber(_page);
          updatePageSize(_pageSize);
        }}
      />
      <Suspense
        fallback={
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
        }
      >
        <ExemplarTraces params={params} source={source} />
      </Suspense>
    </>
  );
}
