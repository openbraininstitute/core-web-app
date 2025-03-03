import { Button } from 'antd';

import { classNames } from '@/util/utils';

type PlansFooterProps = {
  disableNextPayment: boolean;
  onCancel: () => void;
  onNextStep: () => void;
};
export function PlansFooter({ disableNextPayment, onCancel, onNextStep }: PlansFooterProps) {
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
  );
}

type PaymentFooterProps = {
  loading: boolean;
  disabled: boolean;
  onCancel: () => void;
  onPreviousStep: () => void;
};

export function PaymentFooter({ loading, disabled, onCancel, onPreviousStep }: PaymentFooterProps) {
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
  );
}

type ContactFooterProps = {
  loading: boolean;
  onCancel: () => void;
  onPreviousStep: () => void;
};

export function ContactUsFooter({ loading, onCancel, onPreviousStep }: ContactFooterProps) {
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
  );
}
