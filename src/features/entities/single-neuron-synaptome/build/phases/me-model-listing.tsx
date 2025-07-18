'use client';

import { WarningOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { ReactElement, useState } from 'react';
import { Form } from 'antd';
import { z } from 'zod';

import dynamic from 'next/dynamic';

import useBuildSingleNeuronSynaptomeSessionState from '@/features/entities/single-neuron-synaptome/build/create.state-session';
import useRowSelection from '@/components/explore-section/ExploreSectionListingView/useRowSelection';

import { ExploreDataScope } from '@/types/explore-section/application';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { DataType } from '@/constants/explore-section/list-views';
import { classNames } from '@/util/utils';

import type { Props as ExploreSectionListingViewProps } from '@/components/explore-section/ExploreSectionListingView';
import type { WorkspaceContext } from '@/types/common';
import type { IMEModel } from '@/api/entitycore/types';

const ExploreSectionListingView = dynamic(
  () => import('@/components/explore-section/ExploreSectionListingView'),
  {
    ssr: false,
  }
) as unknown as (props: ExploreSectionListingViewProps<IMEModel>) => ReactElement | null;

type Props = WorkspaceContext & {
  stateId: string;
};

const memodelSchema = z
  .array(
    z.object({
      id: z.string().uuid(),
    })
  )
  .nonempty();

export default function MeModelsListingView({ virtualLabId, projectId, stateId }: Props) {
  const form = Form.useFormInstance();
  const { push: navigate } = useRouter();
  const [emptyMEmodelError, setEmptyMEmodelError] = useState(false);
  const { phase, updateQueryConfig, setSessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    virtualLabId,
    projectId,
    stateId,
  });
  const { selectedRows } = useRowSelection({ dataKey: stateId });
  const { setFieldValue, validateFields } = Form.useFormInstance();

  const gotoSynaptomeConfiguration = async () => {
    setEmptyMEmodelError(false);
    await validateFields(['model_id']);
    const { success } = await memodelSchema.safeParseAsync(selectedRows);
    if (success) {
      const value = selectedRows[0].id;
      setFieldValue('model_id', value);
      updateQueryConfig({ phase: 'placement', memodelId: value, stateId });
    } else {
      setEmptyMEmodelError(true);
    }
  };

  const onNavigateToMeModel = (_: string, record: IMEModel): void => {
    setSessionValue({
      name: form.getFieldValue('name'),
      description: form.getFieldValue('description'),
      selectedRows: selectedRows as unknown as Array<IMEModel>,
    });
    navigate(
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        dataType: DataType.CircuitMEModel,
        entityId: record.id,
      })
    );
  };

  return (
    <div
      className={classNames(
        'flex h-[calc(100vh-51px)] w-full flex-col p-10',
        phase !== 'me-model' && 'hidden'
      )}
    >
      <Form.Item name="model_id" hidden>
        <input name="model_id" aria-hidden hidden />
      </Form.Item>
      <div className="mb-4">
        <h1 className="text-primary-8 text-xl font-bold">
          Select a single neuron model to build a synaptome model
        </h1>
        {emptyMEmodelError && (
          <i className="text-pink-700">
            <WarningOutlined />
            You have to select an ME model to proceed to synapses configuration.
          </i>
        )}
      </div>
      <div id="explore-table-container-for-observable" className="h-full w-full overflow-auto pb-5">
        <ExploreSectionListingView
          tableScrollable
          controlsVisible={false}
          dataType={DataType.CircuitMEModel}
          dataScope={ExploreDataScope.SelectedBrainRegion}
          virtualLabInfo={{ virtualLabId, projectId }}
          selectionType="radio"
          onRowsSelected={(rows) => {
            setEmptyMEmodelError(false);
            setSessionValue({
              name: form.getFieldValue('name'),
              description: form.getFieldValue('description'),
              selectedRows: rows as Array<IMEModel>,
            });
          }}
          onCellClick={onNavigateToMeModel}
          dataKey={stateId}
          useBrainRegion={false}
        />
      </div>
      <button
        type="button"
        className={classNames(
          'bg-primary-8 fixed right-10 bottom-10 rounded-none px-7 py-4 text-white disabled:bg-neutral-400',
          'disabled:text-primary-7 disabled:border-primary-7 disabled:cursor-not-allowed disabled:border disabled:bg-white'
        )}
        onClick={gotoSynaptomeConfiguration}
        disabled={!selectedRows.length}
      >
        Use single neuron model
      </button>
    </div>
  );
}
