'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { get } from 'es-toolkit/compat';

import { cancelSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { notify } from '@/components/notification';
import { messages } from '@/i18n/en/payment';
import { Button } from '@/ui/molecules/button';
import { keyBuilder } from '@/ui/use-query-keys/user';
import { cn } from '@/utils/css-class';

type Props = {
  onBack: () => void;
};

export function DowngradeFree({ onBack }: Props) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationKey: ['cancel-subscription'],
    mutationFn: ({ reason }: { reason: string }) => cancelSubscription({ reason: String(reason) }),
    onError: (err) => {
      const message = messages.subscriptionDowngradeErrorTitle;
      const errorCode = get(err, 'cause.code', 'DEFAULT');
      const errorMessages = {
        ENTITY_NOT_FOUND: messages.subscriptionDowngradeErrorEntityNotFoundDescription,
        INVALID_REQUEST: messages.subscriptionDowngradeErrorInvalidRequestDescription,
        DEFAULT: messages.subscriptionDowngradeErrorDescription,
      };
      const description = get(
        errorMessages,
        errorCode,
        messages.subscriptionDowngradeErrorDescription
      );
      notify.error({
        title: message,
        description,
        key: 'subscription-downgrade-error',
      });
    },
    onSuccess: (res) => {
      if (res?.subscription.current_period_end) {
        const description = messages.subscriptionDowngradeSuccessDescription.replace(
          '$$date',
          format(new Date(res.subscription.current_period_end), 'MMM dd, yyyy')
        );
        notify.success({
          title: messages.subscriptionDowngradeSuccessTitle,
          description,
          key: 'subscription-downgrade-success',
        });
      }
      onBack();
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: keyBuilder.subscription() });
    },
  });

  const onDowngradeSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.target;
    const formData = new FormData(target);
    await mutateAsync(
      { reason: String(formData.get('reason')) },
      {
        onSettled: () => e.currentTarget.reset(),
      }
    );
  };

  return (
    <div className="flex flex-col gap-2 border border-gray-100 p-7 rounded-2xl">
      <h1 className="text-3xl font-semibold text-primary-9">Downgrading</h1>
      <div className="text-primary-9 text-lg font-light">
        <p className="mb-0">
          If you downgrade to the Free plan, you’ll lose access to Pro pricing.
        </p>
        <p className="text-base font-light">
          Workflow runs such as builds, simulations, notebooks, and AI assistant usage will be
          charged at the standard Free plan rates.
        </p>
      </div>
      <form name="downgrade-form" className="mt-3" onSubmit={onDowngradeSubmit}>
        <label htmlFor="reason" className="mb-1 text-lg font-bold text-primary-9">
          Reason <span className="text-sm font-light text-neutral-400">(Optional):</span>
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={5}
          className={cn(
            'border! w-full rounded-lg border-neutral-2 p-3 text-lg font-medium! text-black!',
            'outline-none focus:border-primary-4 focus:ring-gray-200 focus:ring-2'
          )}
        />
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            rounded
            type="button"
            variant="outline"
            size="lg"
            className="hover:bg-primary-9! hover:text-white w-max  text-primary-9"
            onClick={onBack}
          >
            Keep Pro Plan
          </Button>
          <Button
            rounded
            type="submit"
            variant="shadow"
            size="lg"
            disabled={isPending}
            className={cn('w-max')}
          >
            <div className="flex items-center gap-2">
              Confirm downgrade
              {isPending && <LoadingOutlined spin />}
            </div>
          </Button>
        </div>
      </form>
    </div>
  );
}
