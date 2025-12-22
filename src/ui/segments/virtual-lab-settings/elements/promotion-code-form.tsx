'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form } from 'antd';
import { get } from 'es-toolkit/compat';
import { useState } from 'react';
import z from 'zod';

import { redeemPromotionCode } from '@/api/virtual-lab-svc/queries/promotion';
import { SparklesFill } from '@/components/icons/sparkles';
import { Button } from '@/ui/molecules/button';
import { Input } from '@/ui/molecules/input';
import {
  PurchaseModeDictionary,
  type TPurchaseModeDictionary,
} from '@/ui/segments/virtual-lab-settings/elements/payment-mode-selection';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

const PromoCodeSchema = z.object({
  promo_code: z.string().min(1),
});

export function PromotionCode({
  virtualLabId,
  onModeChange,
}: {
  virtualLabId: string;
  onModeChange: (m: TPurchaseModeDictionary) => void;
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
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.accounting({ virtualLabId }),
      });
    },
  });

  const handlePromoApply = async ({ promo_code }: { promo_code: string }) => {
    setError(null);
    await redeemAsync(promo_code);
  };

  return (
    <div
      className={cn(
        'rounded-2xl bg-gradient-to-br from-emerald-500/15',
        'to-emerald-500/5 p-6 backdrop-blur-lg select-none md:p-8'
      )}
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-emerald-400/30 p-2">
          <SparklesFill className="h-5 w-5 text-emerald-100" />
        </div>
        <h2 className="text-xl font-semibold text-white">Redeem Promo Code</h2>
      </div>

      <Form
        name="promotion-code"
        className="space-y-6 [&_.ant-form-item-explain-error]:text-sm"
        onFinish={handlePromoApply}
        initialValues={{
          promo_code: undefined,
        }}
        disabled={isPending}
        form={form}
      >
        <div className="w-full">
          <div className="mb-3 block text-white">Promotion Code</div>
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
            className="mb-0"
            extra={
              <span className="text-error text-sm select-none">
                {get(promoError, 'cause.message', null)}
              </span>
            }
          >
            <Input
              type="text"
              min={1}
              placeholder="Enter promotion code"
              className={cn(
                'h-16 w-full rounded-xl border-white/20 bg-[#052f66] text-white placeholder:text-white/50',
                '[appearance:textfield] border px-4 py-1 pr-28 text-xl! font-bold placeholder:text-sm',
                '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
              )}
            />
          </Form.Item>

          {isSuccess && (
            <div className="rounded-lg bg-emerald-500/20 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-emerald-100">
                <SparklesFill className="h-5 w-5" />
                <span className="font-medium">Code applied successfully!</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">
                +{result.data?.credits_granted} Credits
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={() => onModeChange(PurchaseModeDictionary.Selection)}
            variant="outline"
            className="h-12 flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="success"
            className="h-12 flex-1 text-base font-semibold disabled:opacity-50"
            disabled={disableSubmit}
          >
            Apply Code
          </Button>
        </div>
      </Form>
    </div>
  );
}
