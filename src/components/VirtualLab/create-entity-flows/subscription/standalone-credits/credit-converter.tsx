'use client';

import { Button } from 'antd';
import { atom, useAtom } from 'jotai';

import { classNames } from '@/util/utils';

const formatInputValue = (value: number) => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
};

export const CONVERSION_RATE = 0.1;
export const creditAtom = atom<{
  credits: number;
  step: 'overview' | 'pay' | null;
}>({
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
  const money = parseFloat(Number(credits * CONVERSION_RATE).toFixed(2));

  const handleCreditsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    const numericValue = value === '' ? 0 : parseFloat(Number(value).toFixed(2));

    updateCreditState((prev) => ({ ...prev, credits: numericValue }));
  };

  const onClick = () => {
    if (credits > 0) {
      updateCreditState((prev) => ({ ...prev, step: 'pay' }));
    }
  };

  return (
    <div data-testid="credit-converter" className="mx-auto flex w-full flex-col items-center">
      <div className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <div className="mb-4 w-full bg-white">
          <div className="flex w-full items-center justify-center">
            <span className="text-primary-8 text-base font-semibold">Credits</span>
            <div className="mx-4 py-2">
              <input
                type="text"
                value={formatInputValue(credits)}
                onChange={handleCreditsChange}
                className="text-primary-8 w-full max-w-32 min-w-24 rounded-sm border border-gray-200 px-4 py-2 text-center text-xl font-bold"
                aria-label="Credit amount"
              />
            </div>
            <span className="text-primary-8 text-base font-bold">CHF {money}</span>
          </div>
        </div>
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
              disabled={credits <= 0}
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
