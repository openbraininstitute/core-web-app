'use client';

import { Button } from 'antd';
import { atom, useAtom } from 'jotai';
import { useState } from 'react';

import { formatMinorCurrency } from '@/features/stripe/utils';
import { classNames } from '@/util/utils';

import { CreditsAmountInput } from './credits-amount-input';
import { useCreditConversionQuery } from './hooks';

import type { CreditConversionResponse } from '@/api/virtual-lab-svc/queries/types';

export const creditAtom = atom<{ credits: number; step: 'overview' | 'pay' | null }>({
  credits: 0,
  step: 'overview',
});

export function CreditConverter({
  showActions = true,
  onClose,
}: {
  showActions?: boolean;
  onClose: () => void;
}) {
  const [{ credits }, updateCreditState] = useAtom(creditAtom);
  const [conversion, setConversion] = useState<CreditConversionResponse | null>(null);
  const conversionQuery = useCreditConversionQuery({
    payload: credits > 0 ? { credits, currency: 'chf' } : null,
    enabled: false,
  });

  const handleCreditsChange = (value: number | undefined) => {
    setConversion(null);
    updateCreditState((prev) => ({ ...prev, credits: value ?? 0 }));
  };

  const onClick = async () => {
    if (credits > 0) {
      const nextConversion = await conversionQuery.refetch();
      if (nextConversion.data) {
        setConversion(nextConversion.data);
        updateCreditState((prev) => ({ ...prev, step: 'pay' }));
      }
    }
  };

  return (
    <div data-testid="credit-converter" className="mx-auto flex w-full flex-col items-center">
      <div className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <CreditsAmountInput
          value={credits || undefined}
          onValueChange={handleCreditsChange}
          hint={
            conversion ? formatMinorCurrency(conversion.amount, conversion.currency) : 'CHF 0.00'
          }
          className="mb-4 border-gray-200 bg-white text-primary-8 shadow-xs"
          inputClassName="border-gray-200 bg-white text-center text-primary-8 placeholder:text-primary-8/40"
          loadingHint={conversionQuery.isFetching}
        />
        {showActions && (
          <div className="flex items-center justify-center gap-2">
            <Button
              key="back-to-btn"
              className={classNames(
                'text-primary-8 rounded-md bg-white px-6',
                'hover:border-primary-8 hover:text-primary-8! hover:border! hover:bg-white! hover:font-bold'
              )}
              type="text"
              size="large"
              htmlType="button"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              key="back-to-btn"
              className={classNames(
                'text-primary-8 rounded-md border-gray-300 bg-white px-6',
                'hover:border-primary-8 hover:text-primary-8! hover:border! hover:bg-white! hover:font-bold'
              )}
              type="text"
              size="large"
              htmlType="button"
              disabled={credits <= 0 || conversionQuery.isFetching}
              onClick={onClick}
            >
              Payment
            </Button>
          </div>
        )}
      </div>
      {!showActions && (
        <div className="my-8 flex gap-2">
          <span className="h-2 w-2 rounded-full bg-gray-400" />
          <span className="h-2 w-2 rounded-full bg-gray-300" />
          <span className="h-2 w-2 rounded-full bg-gray-300" />
        </div>
      )}
    </div>
  );
}
