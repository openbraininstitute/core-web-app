import { Button } from 'antd';
import { classNames } from '@/util/utils';
import type { Step } from '@/components/VirtualLab/create-entity-flows/common/types';

type Props = {
  loading: boolean;
  step: Step;
  disableNextPlans: boolean;
  disableNextMembers: boolean;
  disableCreate: boolean;
  onCancel: () => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
};

export default function Footer({
  loading,
  step,
  disableNextPlans,
  disableNextMembers,
  disableCreate,
  onCancel,
  onNextStep,
  onPreviousStep,
}: Props) {
  return (
    <div className="mt-auto w-full">
      {step === 'information' || step === 'plans' ? (
        <div className="flex items-end justify-end gap-3">
          <Button
            key="cancel-information-btn"
            className={classNames(
              'h-14 rounded-none bg-primary-9 px-6 text-white hover:bg-gray-200',
              'hover:!border hover:border-white hover:bg-black/10 hover:!text-white'
            )}
            type="text"
            size="large"
            htmlType="button"
            onClick={onCancel}
          >
            Cancel
          </Button>
          {step === 'plans' && (
            <Button
              key="back-to-information-btn"
              className={classNames(
                'h-14 rounded-none bg-primary-9 px-6 text-white hover:bg-gray-200',
                'hover:!border hover:border-white hover:bg-black/10 hover:!text-white'
              )}
              type="text"
              size="large"
              htmlType="button"
              onClick={onPreviousStep}
            >
              Back
            </Button>
          )}
          <Button
            key="next-to-members-btn"
            className={classNames(
              'h-14 rounded-none border border-white bg-primary-9 px-14 text-white',
              'hover:!border hover:!border-white hover:bg-black/10 hover:!text-white',
              'disabled:bg-black/20 disabled:!text-white'
            )}
            type="default"
            size="large"
            htmlType="button"
            onClick={onNextStep}
            disabled={step === 'information' ? disableNextPlans : disableNextMembers}
          >
            Next
          </Button>
        </div>
      ) : (
        <div className="flex items-end justify-end gap-3">
          <Button
            key="cancel-members-btn"
            className={classNames(
              'h-14 rounded-none bg-primary-9 px-6 text-white hover:bg-gray-200',
              'hover:!border hover:border-white hover:bg-black/10 hover:!text-white'
            )}
            type="text"
            size="large"
            htmlType="button"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            key="back-to-plans-btn"
            className={classNames(
              'h-14 rounded-none bg-primary-9 px-6 text-white hover:bg-gray-200',
              'hover:!border hover:border-white hover:bg-black/10 hover:!text-white'
            )}
            type="text"
            size="large"
            htmlType="button"
            onClick={onPreviousStep}
          >
            Back
          </Button>
          <Button
            key="create-vlab-btn"
            className={classNames(
              'h-14 rounded-none border border-white bg-primary-9 px-14 text-white',
              'hover:!border hover:!border-white hover:bg-black/10 hover:!text-white',
              'disabled:bg-black/20 disabled:!text-white'
            )}
            type="default"
            size="large"
            htmlType="submit"
            disabled={disableCreate}
            loading={loading}
          >
            Create
          </Button>
        </div>
      )}
    </div>
  );
}
