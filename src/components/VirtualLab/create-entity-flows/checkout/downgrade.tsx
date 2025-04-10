'use client';

import { FormEvent, useTransition } from 'react';
import { Button } from 'antd';
import { format } from 'date-fns';
import isObject from 'lodash/isObject';

import useNotification from '@/hooks/notifications';
import Modal from '@/components/VirtualLab/create-entity-flows/common/modal';

import { TextArea } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { cancelSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { classNames } from '@/util/utils';
import { tryCatch } from '@/api/utils';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function DowngradeFree({ isOpen, onClose }: Props) {
  const { error: errorNotify, success: successNotify } = useNotification();
  const [cancelling, startTransition] = useTransition();

  const onDowngradeSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const { data: result, error } = await tryCatch(
        cancelSubscription({ reason: String(formData.get('reason')) })
      );
      if (error) {
        let message =
          'There was a problem processing your payment. Please try again or contact support if the issue persists.';
        if (isObject(error.cause) && 'error_code' in error.cause) {
          if (error.cause.error_code === 'ENTITY_NOT_FOUND') {
            message = "You don't have an active subscription";
          }
          if (error.cause.error_code === 'INVALID_REQUEST') {
            message = 'This subscription has already been cancelled and cannot be cancelled again';
          }
        }
        errorNotify(message, undefined, 'topRight', true);
      }
      if (result?.subscription.current_period_end) {
        successNotify(
          `
                      Subscription cancelled. Your subscription will remain active until 
                      ${format(new Date(result.subscription.current_period_end), 'MMM dd, yyyy')}
                  `,
          undefined,
          'topRight',
          true
        );
      }
      onClose();
    });
  };

  return (
    <Modal onClose={onClose} isOpen={isOpen} cls={{ content: 'min-h-[8rem]!' }} footer={null}>
      <div className="flex flex-col gap-2">
        <h1 className="text-primary-8 text-3xl font-bold">Downgrading</h1>
        <p className="text-lg font-light">
          If you choose to downgrade from Pro plan to the free plan you will loose access to your
          virtual lab and invited virtual labs
        </p>
        <form name="downgrade-form" className="mt-3" onSubmit={onDowngradeSubmit}>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label htmlFor="reason" className="text-primary-8 mb-1 text-lg font-bold">
            Reason <span className="text-sm font-light text-gray-400">(Optional):</span>
          </label>
          <TextArea name="reason" rows={10} className="border!" />
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              key="cancel-btn"
              className={classNames(
                'text-primary-8 h-14 rounded-none border-0 px-6',
                'hover:border-primary-8! hover:text-primary-8! hover:border! hover:bg-white!'
              )}
              size="large"
              htmlType="button"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              key="confirm-btn"
              className={classNames(
                'text-primary-8 h-14 rounded-none px-6',
                'border-primary-8! hover:bg-primary-8! border! hover:font-bold hover:text-white!'
              )}
              size="large"
              htmlType="submit"
              disabled={cancelling}
              loading={cancelling}
            >
              Confirm
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
