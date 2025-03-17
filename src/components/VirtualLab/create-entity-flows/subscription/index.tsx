'use client';

import { FormEvent, useState, useTransition } from 'react';
import { Button } from 'antd';
import { format } from 'date-fns';
import Link from 'next/link';
import isObject from 'lodash/isObject';

import useNotification from '@/hooks/notifications';
import Modal from '@/components/VirtualLab/create-entity-flows/common/modal';

import { UserActiveSubscriptionResponse } from '@/api/virtual-lab-svc/queries/types';
import { cancelSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { TextArea } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { classNames } from '@/util/utils';
import { tryCatch } from '@/api/utils';

function Upgrade() {
  return (
    <Link
      href="/app/virtual-lab/account/subscription/checkout"
      key="upgrade-link"
      className={classNames(
        'flex h-14 items-center justify-center rounded-none border border-white bg-primary-9 px-14 text-lg text-white',
        'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
        'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
        'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
      )}
    >
      Upgrade
    </Link>
  );
}

function Downgrade({ onClick }: { onClick: () => void }) {
  return (
    <Button
      key="downgrade-link"
      className={classNames(
        'h-14 rounded-none border border-white bg-primary-9 px-14 text-lg text-white',
        'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
        'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
        'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
      )}
      type="default"
      size="large"
      onClick={onClick}
    >
      Downgrade
    </Button>
  );
}

export async function FreeSubscriptionFlow() {
  return (
    <div className="h-full w-full">
      <div className="flex w-full items-center justify-end gap-3">
        <Upgrade />
      </div>
    </div>
  );
}

export function PaidSubscriptionFlow({ data }: { data: UserActiveSubscriptionResponse }) {
  const [open, setOpen] = useState(false);
  const { error: errorNotify, success: successNotify } = useNotification();
  const [cancelling, startTransition] = useTransition();
  const onDowngradeClick = () => setOpen(true);
  const onDowngradeClose = () => setOpen(false);

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
      onDowngradeClose();
    });
  };

  return (
    <div className="h-full w-full">
      <div className="flex w-full items-center justify-end gap-3">
        {!(data?.subscription.cancel_at_period_end || data?.subscription.canceled_at) && (
          <Downgrade onClick={onDowngradeClick} />
        )}
        {data?.subscription.canceled_at || (data?.subscription.type === 'free' && <Upgrade />)}
      </div>
      <Modal
        onClose={onDowngradeClose}
        isOpen={open}
        cls={{ content: '!min-h-[8rem]' }}
        footer={null}
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-primary-8">Downgrading</h1>
          <p className="text-lg font-light">
            If you choose to downgrade from Pro plan to the free plan you will loose access to your
            virtual lab and invited virtual labs
          </p>
          <form name="downgrade-form" className="mt-3" onSubmit={onDowngradeSubmit}>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="reason" className="mb-1 text-lg font-bold text-primary-8">
              Reason <span className="text-sm font-light text-gray-400">(Optional):</span>
            </label>
            <TextArea name="reason" rows={10} className="!border" />
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                key="cancel-btn"
                className={classNames(
                  'h-14 rounded-none border-0 px-6 text-primary-8',
                  'hover:!border hover:!border-primary-8 hover:!bg-white hover:!text-primary-8'
                )}
                size="large"
                htmlType="button"
                onClick={onDowngradeClose}
              >
                Cancel
              </Button>
              <Button
                key="confirm-btn"
                className={classNames(
                  'h-14 rounded-none px-6 text-primary-8',
                  '!border !border-primary-8 hover:!bg-primary-8 hover:font-bold hover:!text-white'
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
    </div>
  );
}
