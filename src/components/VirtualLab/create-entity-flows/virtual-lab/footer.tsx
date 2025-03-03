import { Button } from 'antd';
import { classNames } from '@/util/utils';
import {
  virtualLabFlowSteps,
  type VirtualLabFlowSteps,
} from '@/components/VirtualLab/create-entity-flows/common/types';
import { useRouter } from 'next/navigation';
import { generateLabUrl } from '@/util/virtual-lab/urls';
import { useAtomValue } from 'jotai';
import { vlabFlowState } from './flow-state';

type Props = {
  loading: boolean;
  step: VirtualLabFlowSteps;
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
        {step !== virtualLabFlowSteps.at(0)?.id && (
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
        {step !== virtualLabFlowSteps.at(-1)?.id && (
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
            disabled={step === 'information' ? disableNextPlans : disableNextMembers}
          >
            Next
          </Button>
        )}
        {step === virtualLabFlowSteps.at(-1)?.id && (
          <Button
            key="create-vlab-btn"
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
            Create virtual lab
          </Button>
        )}
      </div>
    </div>
  );
}


type CreateVirtualLabFooterProps = {
  loading: boolean;
  disabled: boolean;
  onCancel: () => void;
}

export function CreateVirtualLabFooter({
  loading,
  disabled,
  onCancel,
}: CreateVirtualLabFooterProps) {
  return (
    <div className="mx-auto mt-auto w-full max-w-5xl lg:max-w-full">
      <div className="px-4 py-4">
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
            <Button
              key="create-vlab-btn"
              className={classNames(
                'h-14 rounded-none border border-white bg-primary-9 px-14 text-white',
                'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
                'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
                'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
              )}
              type="default"
              size="large"
              htmlType="submit"
              disabled={disabled}
              loading={loading}
            >
              Create virtual lab
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

type AddMembersFooterProps = {
  loading: boolean;
  disabled: boolean;
  showSubmit?: boolean;
  onCancel: () => void;
  onPrevious: () => void;

}

export function AddMembersFooter({
  loading,
  disabled,
  showSubmit = true,
  onCancel,
  onPrevious,
}: AddMembersFooterProps) {
  const { push: navigate } = useRouter();
  const flowState = useAtomValue(vlabFlowState);

  const redirectToVirtualLab = () => {
    const labUrl = generateLabUrl(flowState?.information?.id!);
    navigate(`${labUrl}/overview`);
  }

  return (
    <div className="mx-auto mt-auto w-full max-w-5xl lg:max-w-full">
      <div className="px-4 py-4">
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
            <Button
              key="back-to-btn"
              className={classNames(
                'h-14 rounded-none bg-white px-6 text-primary-8',
                'hover:!border hover:border-primary-8 hover:!bg-white hover:font-bold hover:!text-primary-8'
              )}
              type="text"
              size="large"
              htmlType="button"
              onClick={onPrevious}
            >
              Back
            </Button>
            {showSubmit ? (
              <Button
                key="create-vlab-btn"
                className={classNames(
                  'h-14 rounded-none border border-white bg-primary-9 px-14 text-white',
                  'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
                  'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
                  'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
                )}
                type="default"
                size="large"
                htmlType="submit"
                disabled={disabled}
                loading={loading}
              >
                Add members
              </Button>
            ) : (
              <Button
                key="go-to-vlab-btn"
                className={classNames(
                  'h-14 rounded-none border border-white bg-primary-9 px-14 text-white',
                  'hover:!border hover:!border-primary-8 hover:!bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
                  'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
                  'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
                )}
                type="text"
                size="large"
                htmlType="button"
                onClick={redirectToVirtualLab}
              >
                Open virtual lab
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

type PlansFooterProps = {
  disableNextPayment: boolean;
  onCancel: () => void;
  onNextStep: () => void;
}
export function PlansFooter({
  disableNextPayment,
  onCancel,
  onNextStep,
}: PlansFooterProps) {
  return (
    <div className="mx-auto mt-auto w-full max-w-5xl lg:max-w-full">
      <div className="px-4 py-4">
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
            <Button
              key="next-to-payment-btn"
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
              disabled={disableNextPayment}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

type PaymentFooterProps = {
  loading: boolean;
  disabled: boolean;
  onCancel: () => void;
  onPreviousStep: () => void;
}

export function PaymentFooter({
  loading,
  disabled,
  onCancel,
  onPreviousStep,
}: PaymentFooterProps) {
  return (
    <div className="mx-auto mt-auto w-full max-w-5xl lg:max-w-full">
      <div className="px-4 py-4">
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
            <Button
              key="pay-subscription"
              className={classNames(
                'h-14 rounded-none border border-white bg-primary-9 px-14 text-white',
                'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
                'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
                'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
              )}
              type="default"
              size="large"
              htmlType="submit"
              disabled={disabled}
              loading={loading}
            >
              Pay
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


type ContactFooterProps = {
  loading: boolean;
  onCancel: () => void;
  onPreviousStep: () => void;
}

export function ContactUsFooter({
  loading,
  onCancel,
  onPreviousStep,
}: ContactFooterProps) {
  return (
    <div className="mx-auto mt-auto w-full max-w-5xl lg:max-w-full">
      <div className="px-4 py-4">
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
            <Button
              key="contact-us"
              className={classNames(
                'h-14 rounded-none border border-white bg-primary-9 px-14 text-white',
                'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
                'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
                'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
              )}
              type="default"
              size="large"
              htmlType="submit"
              disabled={loading}
              loading={loading}
            >
              Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
