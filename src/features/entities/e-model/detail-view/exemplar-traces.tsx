import { useAtom, useAtomValue } from 'jotai';
import { Pagination } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { Suspense } from 'react';

// import { eCodesDocumentationUrl } from '@/constants/cell-model-assignment/e-model';
import DefaultEModelTable from '@/components/build-section/cell-model-assignment/e-model/EModelView/DefaultEModelTable';
import ErrorData from '@/components/message-banners/error';

import { ElectricalCellRecording } from '@/entity-configuration/domain/experimental/electrical-cell-recording';
import { pageNumberAtom, pageSizeAtom } from '@/state/explore-section/list-view-atoms';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { getFieldsDefinition } from '@/entity-configuration/definitions';
import { experimentalTracesAtomFamily } from '@/state/e-model';
import { resolveDataKey } from '@/utils/key-builder';
import { useUnwrappedValue } from '@/hooks/hooks';

import type { IElectricalCellRecording, IEModel } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

const defaultPageSize = 5;
const defaultColumnsFields = getFieldsDefinition([
  EntityCoreFields.Preview,
  EntityCoreFields.Name,
  EntityCoreFields.MType,
  EntityCoreFields.EType,
  EntityCoreFields.Species,
]);

const defaultColumns: ColumnsType<IElectricalCellRecording> = Object.entries(
  defaultColumnsFields
).map(([key, field]) => ({
  title: field.title.toUpperCase(),
  key,
  render: field.render,
}));

// const eCodesLink = (
//   <div className="w-[100px]">
//     <a href={eCodesDocumentationUrl} target="_blank">
//       More info about e-codes <GlobalOutlined />
//     </a>
//     <Divider />
//   </div>
// );

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

  const columns: ColumnsType<IElectricalCellRecording> = [...defaultColumns];

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
      {/* {eModelExemplarTraces ? (
        <>
          <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
            <DefaultLoadingSuspense>
              <FeatureSelectionContainer />
            </DefaultLoadingSuspense>
          </ErrorBoundary>
        </>
      ) : (
        <Spin />
      )} */}
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
              {[...Array(5)].map((_, i) => (
                <div
                  key={`row-ske-${i}`}
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
