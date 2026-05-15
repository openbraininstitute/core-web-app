'use client';

import { ArrowLeftOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form } from 'antd';
import { get } from 'es-toolkit/compat';
import { useState } from 'react';
import z from 'zod';

import { redeemPromotionCode } from '@/api/virtual-lab-svc/queries/promotion';
import { SparklesFill } from '@/components/icons/sparkles';
import { Input } from '@/ui/molecules/input';
import {
  PurchaseModeDictionary,
  type TPurchaseModeDictionary,
} from '@/ui/segments/virtual-lab-settings/elements/payment-mode-selection';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import { GhostRoundedIconButton } from '../../workspaces/space-manager/sections/elements';

const PromoCodeSchema = z.object({
  promo_code: z.string().min(1),
});

export function PromotionCode({
  virtualLabId,
  onModeChange,
  classnames,
}: {
  virtualLabId: string;
  onModeChange: (m: TPurchaseModeDictionary) => void;
  classnames?: {
    root?: string;
  };
}) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<{ promo_code: string }>();
  const [promoError, setError] = useState<Error | null>(null);
  const watcher = Form.useWatch([], form);
  const disableSubmit = !PromoCodeSchema.safeParse(watcher).success;

  const {
    mutateAsync: redeemAsync,
    data: result,
    isSuccess,
    isPending,
  } = useMutation({
    mutationFn: (value: string) =>
      redeemPromotionCode({
        payload: {
          virtual_lab_id: virtualLabId,
          code: value,
        },
      }),
    onError(error) {
      setError(error);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: keyBuilder.accounting({ virtualLabId }) });
    },
  });

  const handlePromoApply = async ({ promo_code }: { promo_code: string }) => {
    setError(null);
    await redeemAsync(promo_code);
  };

  return (
    <section
      id="promotion-code-form"
      data-testid="promotion-code-form"
      className={cn(
        'flex h-full min-h-0 w-full flex-1 flex-col gap-3.5 rounded-2xl bg-white pt-0',
        classnames?.root
      )}
    >
      <div className="shrink-0 pt-5 back-button-wrapper">
        <GhostRoundedIconButton
          icon={<ArrowLeftOutlined />}
          label="Select option"
          classNames={{ label: 'font-semibold', root: 'hover:bg-gray-100' }}
          onClick={() => onModeChange('selection')}
          iconPosition="start"
        />
      </div>
      <div className="min-h-0 flex-1 mb-4 overflow-x-hidden overflow-y-auto secondary-scrollbar [scrollbar-gutter:stable]">
        <div
          id="standalone-stripe-payment-content"
          className="mr-1 flex flex-col rounded-2xl border border-gray-100 p-4"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-teal-600/80 p-2">
              <SparklesFill className="h-5 w-5 text-teal-200" />
            </div>
            <h2 className="text-xl font-semibold text-primary-9">Redeem promotion code</h2>
          </div>

          <Form
            name="promotion-code"
            className="[&_.ant-form-item-explain-error]:text-sm"
            onFinish={handlePromoApply}
            initialValues={{
              promo_code: undefined,
            }}
            disabled={isPending}
            form={form}
          >
            <div className="w-full">
              <Form.Item
                label={null}
                name="promo_code"
                id="promo_code"
                rules={[
                  {
                    type: 'string',
                    required: true,
                    min: 1,
                    message: 'Please enter promotion code',
                  },
                ]}
                className="mb-0!"
                extra={
                  <span className="text-destructive text-sm select-none">
                    {get(promoError, 'cause.message', null)}
                  </span>
                }
              >
                <Input
                  inputMode="text"
                  min={1}
                  placeholder="Enter promotion code"
                  className={cn(
                    'rounded-2xl min-h-14 text-xl! border-2 border-gray-100! bg-transparent! px-3 py-2 font-bold tracking-wide text-primary-9! focus:ring-0',
                    'transition-[border-color,box-shadow] duration-200 ease-in-out',
                    'hover:bg-transparent! hover:text-primary-9! focus:bg-transparent! focus:text-primary-9! [&_.ant-input-outlined]:bg-transparent!',
                    'focus:border-pr placeholder:text-primary-9! hover:border-gray-200!',
                    ' focus-within:border-gray-300! focus-visible:ring-0',
                    'placeholder:text-gray-400 placeholder:font-light placeholder:text-sm',
                    '[&.ant-input-status-error]:border-1.5! [&.ant-XInput-status-error]:border-destructive!',
                    '[&.ant-input-status-error]:border-1.5! [&.ant-input-status-error]:border-destructive!'
                  )}
                />
              </Form.Item>

              {isSuccess && (
                <div className="rounded-lg bg-teal-600/50 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-white">
                    <SparklesFill className="h-5 w-5" />
                    <span className="font-bold text-teal-800">Code applied successfully!</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-white">
                    +{result.data?.credits_granted} Credits
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <GhostRoundedIconButton
                type="button"
                label="Cancel"
                classNames={{ label: 'font-semibold', root: 'hover:bg-gray-100' }}
                onClick={() => onModeChange(PurchaseModeDictionary.Selection)}
              />

              <GhostRoundedIconButton
                label="Apply Code"
                type="submit"
                classNames={{
                  root: 'bg-primary-9 text-white hover:bg-primary-8 group px-8',
                  label: 'text-white',
                }}
                disabled={disableSubmit}
              />
            </div>
          </Form>
        </div>
      </div>
    </section>
  );
}
