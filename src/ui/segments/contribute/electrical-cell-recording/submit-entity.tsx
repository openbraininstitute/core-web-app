'use client';

import { CheckOutlined, CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { useMutationState } from '@tanstack/react-query';
import { useRouter } from '@bprogress/next';
import { Form } from 'antd';

import isNil from 'es-toolkit/compat/isNil';
import { buildElectricalCellRecordingMutationKeys } from '@/ui/segments/contribute/electrical-cell-recording/use-pipeline';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';
import {
  ElectricalCellRecordingSchema,
  type TElectricalCellRecordingForm,
} from '@/ui/segments/contribute/electrical-cell-recording/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

type Props = {
  sessionId: string;
};

const useCreateElectricalCellRecordingStatus = ({ sessionId }: Props) => {
  const keys = buildElectricalCellRecordingMutationKeys(sessionId);
  const CreateElectricalCellRecordingStatus = useMutationState({
    filters: {
      mutationKey: keys.CreateElectricalCellRecording.key,
    },
    select: (mutationState) => mutationState.state.status,
  }).at(0);

  const CreateContributionStatus = useMutationState({
    filters: {
      mutationKey: keys.CreateContribution.key,
    },
    select: (mutationState) => mutationState.state.status,
  }).at(0);

  const CreateEtypeClassificationStatus = useMutationState({
    filters: {
      mutationKey: keys.CreateEtypeClassification.key,
    },
    select: (mutationState) => mutationState.state.status,
  }).at(0);

  const CreateAssetsStatus = useMutationState({
    filters: {
      mutationKey: keys.createAssets.key,
    },
    select: (mutationState) => mutationState.state.status,
  }).at(0);

  const CreateElectricalCellRecordingData = useMutationState({
    filters: {
      mutationKey: keys.CreateElectricalCellRecording.key,
    },
    select: (mutationState) => mutationState.state.data as { id: string } | undefined,
  }).at(0);

  const isFinished =
    CreateElectricalCellRecordingStatus === 'success' &&
    CreateContributionStatus === 'success' &&
    CreateEtypeClassificationStatus === 'success' &&
    CreateAssetsStatus === 'success';
  const isError =
    CreateElectricalCellRecordingStatus === 'error' ||
    CreateContributionStatus === 'error' ||
    CreateEtypeClassificationStatus === 'error' ||
    CreateAssetsStatus === 'error';

  return {
    CreateElectricalCellRecordingStatus,
    CreateContributionStatus,
    CreateEtypeClassificationStatus,
    CreateAssetsStatus,
    CreateElectricalCellRecordingData,
    isFinished,
    isError,
  };
};

export function SubmitEntityProgress({ sessionId }: Props) {
  const {
    CreateElectricalCellRecordingStatus,
    CreateContributionStatus,
    CreateEtypeClassificationStatus,
    CreateAssetsStatus,
  } = useCreateElectricalCellRecordingStatus({ sessionId });

  const steps: Array<{
    key: string;
    label: string;
    status?: 'idle' | 'pending' | 'success' | 'error';
  }> = [
    {
      key: 'electrical-cell-recording',
      label: 'Creating Cell Recording',
      status: CreateElectricalCellRecordingStatus,
    },
    { key: 'contribution', label: 'Creating Contribution', status: CreateContributionStatus },
    {
      key: 'etype-classification',
      label: 'Creating E-Type Classification',
      status: CreateEtypeClassificationStatus,
    },
    { key: 'assets', label: 'Uploading Assets', status: CreateAssetsStatus },
  ];

  const completedSteps = steps.filter((step) => step.status === 'success');
  const progress = (completedSteps.length / steps.length) * 100;

  return (
    <HydrateWrapper>
      <div className="flex w-full max-w-max flex-col items-center justify-center space-y-6">
        <div className="relative">
          <svg className="h-64 w-64 -rotate-90 transform xl:h-72 xl:w-72" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="4" fill="none" />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="#003a8c"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
              className="transition-all duration-300 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-primary-8 text-3xl font-bold xl:text-4xl">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
        <div className="text-primary-8 flex flex-col items-center gap-3 text-center">
          <div className="flex flex-col items-start gap-2 text-base font-medium">
            {steps.map((s) => (
              <div key={s?.key} className="flex items-center gap-2">
                {isNil(s.status) && <div className="bg-primary-8 ml-1 size-3 rounded-full!" />}
                {s?.status === 'pending' && (
                  <LoadingOutlined className="text-primary-6 animate-spin text-lg" />
                )}
                {s?.status === 'success' && <CheckOutlined className="text-lg text-teal-600" />}
                {s?.status === 'error' && <CloseOutlined className="text-error text-lg" />}
                <span
                  className={cn({
                    'text-primary-6': s?.status === 'pending',
                    'font-bold text-teal-600': s?.status === 'success',
                    'text-error': s?.status === 'error',
                  })}
                >
                  {s?.label || 'Processing...'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </HydrateWrapper>
  );
}

export function SubmitButton({ loading, sessionId }: { loading: boolean; sessionId: string }) {
  const { virtualLabId, projectId } = useWorkspace();
  const { replace: navigate } = useRouter();
  const form = Form.useFormInstance<TElectricalCellRecordingForm>();
  const values = Form.useWatch([], form);

  const isValidForm = ElectricalCellRecordingSchema.safeParse(values).success;
  const { CreateElectricalCellRecordingData } = useCreateElectricalCellRecordingStatus({
    sessionId,
  });

  const detailsUrl = CreateElectricalCellRecordingData?.id
    ? resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        entityId: CreateElectricalCellRecordingData.id,
        dataType: ExtendedEntitiesTypeDict.ElectricalCellRecording,
      })
    : null;

  return (
    <Form.Item className="mb-0">
      {detailsUrl ? (
        <Button
          rounded
          type="button"
          variant="default"
          size="lg"
          className={cn(
            'disabled:bg-neutral-1 disabled:text-neutral-3!',
            'px-10 select-none hover:text-white disabled:cursor-not-allowed'
          )}
          onClick={() => {
            navigate(detailsUrl);
          }}
        >
          View Details
        </Button>
      ) : (
        <Button
          disabled={!isValidForm || loading}
          rounded
          type="submit"
          variant="success"
          size="lg"
          className={cn(
            'disabled:bg-neutral-1 disabled:text-neutral-3!',
            'px-10 select-none hover:text-white disabled:cursor-not-allowed'
          )}
        >
          Confirm
        </Button>
      )}
    </Form.Item>
  );
}
