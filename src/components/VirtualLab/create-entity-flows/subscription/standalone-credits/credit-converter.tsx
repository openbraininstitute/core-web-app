'use client';

import { useState } from 'react';

const conversionRate = 0.2;
export default function CreditConverter({
  onChange,
}: {
  onChange: (credits: number, amount: number) => void;
}) {
  const [credits, setCredits] = useState(0);
  const [amount, setAmount] = useState(0 * 0.2);

  const handleCreditsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const numericValue = value === '' ? 0 : parseInt(value, 10);

    setCredits(numericValue);
    const newAmount = numericValue * conversionRate;
    setAmount(newAmount);
    onChange(numericValue, newAmount);
  };

  const formatInputValue = (value: number) => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center">
      <div className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex w-full items-center justify-between">
          <span className="text-navy-800 text-base font-semibold">Credits</span>
          <div className="mx-4 flex-1 px-4 py-2">
            <input
              type="text"
              value={formatInputValue(credits)}
              onChange={handleCreditsChange}
              className="text-navy-900 w-full rounded border border-gray-200 px-4 py-2 text-center text-xl font-bold"
              aria-label="Credit amount"
            />
          </div>
          <span className="text-navy-800 text-base font-semibold">CHF {amount}</span>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <span className="h-2 w-2 rounded-full bg-gray-400" />
        <span className="h-2 w-2 rounded-full bg-gray-300" />
        <span className="h-2 w-2 rounded-full bg-gray-300" />
      </div>
    </div>
  );
}
