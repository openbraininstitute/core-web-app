import { Button } from 'antd';

import { classNames } from '@/util/utils';

import type {
  ProjectFlowSteps,
  ProjectFlowStepsArray,
} from '@/components/VirtualLab/create-entity-flows/common/types';

type Props = {
  loading: boolean;
  step: ProjectFlowSteps;
  steps: ProjectFlowStepsArray;
  disableNextProject: boolean;
  disableNextMembers: boolean;
  disableCreate: boolean;
  onCancel: () => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
};

export default function Footer({
  loading,
  step,
  steps,
  disableNextProject,
  disableNextMembers,
  disableCreate,
  onCancel,
  onNextStep,
  onPreviousStep,
}: Props) {
  return (
    <div className="mt-auto w-full">
      <div className="flex items-end justify-end gap-3">
        <Button
          key="cancel-btn"
          className={classNames(
            'h-14 rounded-none bg-white px-6 text-primary-8',
            'hover:!border hover:border-primary-8 hover:!bg-white hover:font-bold hover:!text-primary-8'
          )}
          type="text"
          size="large"
          htmlType="button"
          onClick={onCancel}
        >
          Cancel
        </Button>
        {step !== steps.at(0)?.id && (
          <Button
            key="back-to-btn"
            className={classNames(
              'h-14 rounded-none bg-white px-6 text-primary-8',
              'hover:!border hover:border-primary-8 hover:!bg-white hover:font-bold hover:!text-primary-8'
            )}
            type="text"
            size="large"
            htmlType="button"
            onClick={onPreviousStep}
          >
            Back
          </Button>
        )}
        {step !== steps.at(-1)?.id && (
          <Button
            key="next-to-btn"
            className={classNames(
              'h-14 rounded-none border border-primary-8 bg-white px-14 text-primary-8',
              'hover:!border hover:!border-primary-5 hover:font-bold hover:shadow-sm',
              'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
              'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
            )}
            type="default"
            size="large"
            htmlType="button"
            onClick={onNextStep}
            disabled={step === 'virtual-lab' ? disableNextProject : disableNextMembers}
          >
            Next
          </Button>
        )}
        {step === steps.at(-1)?.id && (
          <Button
            key="create-project-btn"
            className={classNames(
              'h-14 rounded-none border border-white bg-primary-9 px-14 text-white',
              'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
              'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
              'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
            )}
            type="default"
            size="large"
            htmlType="submit"
            disabled={disableCreate}
            loading={loading}
          >
            Create project
          </Button>
        )}
      </div>
    </div>
  );
}
