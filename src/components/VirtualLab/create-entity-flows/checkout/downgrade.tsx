'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import isObject from 'es-toolkit/compat/isObject';
import type { FormEvent } from 'react';
import { cancelSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { useAppNotification } from '@/components/notification';
import { TextArea } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

type Props = {
  onBack: () => void;
};

export default function DowngradeFree({ onBack }: Props) {
  const { error: errorNotify, success: successNotify } = useAppNotification();

  const { mutateAsync, isPending } = useMutation({
    mutationKey: ['cancel-subscription'],
    mutationFn: ({ reason }: { reason: string }) => cancelSubscription({ reason: String(reason) }),
    onError: (err) => {
      let message =
        'There was a problem processing your payment. Please try again or contact support if the issue persists.';
      if (isObject(err.cause) && 'error_code' in err.cause) {
        if (err.cause.error_code === 'ENTITY_NOT_FOUND') {
          message = "You don't have an active subscription";
        }
        if (err.cause.error_code === 'INVALID_REQUEST') {
          message = 'This subscription has already been cancelled and cannot be cancelled again';
        }
      }
      errorNotify({ message, placement: 'topRight' });
    },
    onSuccess: (res) => {
      if (res?.subscription.current_period_end) {
        successNotify({
          message: ` Subscription cancelled. Your subscription will remain active until 
          ${format(new Date(res.subscription.current_period_end), 'MMM dd, yyyy')}
          `,
          placement: 'topRight',
        });
      }
    },
  });

  const onDowngradeSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const formData = new FormData(e.currentTarget);
    await mutateAsync({ reason: String(formData.get('reason')) });
  };

  return (
    <div className="max-h-max">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">Downgrading</h1>
        <p className="text-primary-3 text-lg font-light">
          If you choose to downgrade from Pro plan to the free plan you will loose access to your
          virtual lab and invited virtual labs
        </p>
        <form name="downgrade-form" className="mt-3" onSubmit={onDowngradeSubmit}>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label htmlFor="reason" className="mb-1 text-lg font-bold text-white">
            Reason <span className="text-sm font-light text-gray-400">(Optional):</span>
          </label>
          <TextArea name="reason" rows={10} className="border!" />
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              rounded
              type="button"
              variant="ghost"
              size="lg"
              className="hover:border-primary-4! w-max border border-none text-white shadow-2xl hover:border"
              onClick={onBack}
            >
              Cancel
            </Button>
            <Button
              rounded
              type="button"
              variant="default"
              size="lg"
              className={cn(
                'border-primary-4! w-max border shadow-2xl',
                'hover:bg-primary-8/40',
                'hover:shadow-[1px_2px_4px_0px_#00000099]',
                'shadow-[8px_12px_24px_0px_#00000099]',
                'shadow-[-8px_-8px_42px_0px_#FFFFFF29]',
              )}
              disabled={isPending}
            >
              <div className="flex items-center gap-2">
                Continue to Payment
                {isPending && <LoadingOutlined spin />}
              </div>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
