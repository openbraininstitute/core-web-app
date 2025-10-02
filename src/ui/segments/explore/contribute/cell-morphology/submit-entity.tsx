'use client';

import { CheckOutlined, LoadingOutlined } from '@ant-design/icons';
import { useMutationState } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Form } from 'antd';

import { buildCellMorphologyMutationKeys } from '@/page-wrappers/contribute/use-cell-morphology-pipeline';
import { CellMorphologySchema } from '@/ui/segments/explore/contribute/cell-morphology/helpers';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { resolveExploreDetailsPageUrl2 } from '@/utils/url-builder';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';

type Props = {
  sessionId: string;
};

const useCreateCellMorphologyStatus = ({ sessionId }: Props) => {
  const keys = buildCellMorphologyMutationKeys(sessionId);
  const CreateCellMorphologyStatus = useMutationState({
    filters: {
      mutationKey: keys.CreateCellMorphology.key,
    },
    select: (mutationState) => mutationState.state.status,
  }).at(0);

  const CreateContributionStatus = useMutationState({
    filters: {
      mutationKey: keys.CreateContribution.key,
    },
    select: (mutationState) => mutationState.state.status,
  }).at(0);

  const CreateMtypeClassificationStatus = useMutationState({
    filters: {
      mutationKey: keys.CreateMtypeClassification.key,
    },
    select: (mutationState) => mutationState.state.status,
  }).at(0);

  const CreateAssetsStatus = useMutationState({
    filters: {
      mutationKey: keys.createAssets.key,
    },
    select: (mutationState) => mutationState.state.status,
  }).at(0);

  const CreateCellMorphologyData = useMutationState({
    filters: {
      mutationKey: keys.CreateCellMorphology.key,
    },
    select: (mutationState) => mutationState.state.data as { id: string } | undefined,
  }).at(0);

  const isFinished =
    CreateCellMorphologyStatus === 'success' &&
    CreateContributionStatus === 'success' &&
    CreateMtypeClassificationStatus === 'success' &&
    CreateAssetsStatus === 'success';
  const isError =
    CreateCellMorphologyStatus === 'error' ||
    CreateContributionStatus === 'error' ||
    CreateMtypeClassificationStatus === 'error' ||
    CreateAssetsStatus === 'error';

  return {
    CreateCellMorphologyStatus,
    CreateContributionStatus,
    CreateMtypeClassificationStatus,
    CreateAssetsStatus,
    CreateCellMorphologyData,
    isFinished,
    isError,
  };
};

export function SubmitStatusFollow({ sessionId }: Props) {
  const {
    CreateCellMorphologyStatus,
    CreateContributionStatus,
    CreateMtypeClassificationStatus,
    CreateAssetsStatus,
  } = useCreateCellMorphologyStatus({ sessionId });

  const steps: Array<{
    key: string;
    label: string;
    status?: 'idle' | 'pending' | 'success' | 'error';
  }> = [
    {
      key: 'cell-morphology',
      label: 'Creating Cell Morphology',
      status: CreateCellMorphologyStatus,
    },
    { key: 'contribution', label: 'Creating Contribution', status: CreateContributionStatus },
    {
      key: 'mtype-classification',
      label: 'Creating M-Type Classification',
      status: CreateMtypeClassificationStatus,
    },
    { key: 'assets', label: 'Uploading Assets', status: CreateAssetsStatus },
  ];

  const completedSteps = steps.filter((step) => step.status === 'success');
  const currentStep =
    steps.find((step) => step.status === 'pending') ||
    steps.find((step) => step.status === 'idle') ||
    completedSteps[completedSteps.length - 1];

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
          <div className="flex items-center gap-2 text-base font-medium">
            {currentStep?.status === 'pending' && (
              <LoadingOutlined className="text-primary-6 animate-spin text-lg" />
            )}
            {currentStep?.status === 'success' && (
              <CheckOutlined className="text-success text-lg" />
            )}
            <span>{currentStep?.label || 'Processing...'}</span>
          </div>
        </div>
      </div>
    </HydrateWrapper>
  );
}

export function SubmitButton({ loading, sessionId }: { loading: boolean; sessionId: string }) {
  const router = useRouter();
  const form = Form.useFormInstance();
  const { virtualLabId, projectId } = useWorkspace();
  const { success } = CellMorphologySchema.safeParse(Form.useWatch([], form));

  const { CreateCellMorphologyData, isFinished } = useCreateCellMorphologyStatus({ sessionId });

  const detailsUrl =
    isFinished && CreateCellMorphologyData?.id
      ? resolveExploreDetailsPageUrl2({
          ctx: { virtualLabId, projectId },
          entityId: CreateCellMorphologyData.id,
          dataType: ExtendedEntitiesTypeDict.CellMorphology,
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
          className="disabled:bg-neutral-1 disabled:text-neutral-3! px-10 select-none hover:text-white disabled:cursor-not-allowed"
          onClick={() => {
            router.push(detailsUrl);
          }}
        >
          View Details
        </Button>
      ) : (
        <Button
          disabled={!success || loading}
          rounded
          type="submit"
          variant="success"
          size="lg"
          className="disabled:bg-neutral-1 disabled:text-neutral-3! px-10 select-none hover:text-white disabled:cursor-not-allowed"
        >
          Confirm
        </Button>
      )}
    </Form.Item>
  );
}
