'use client';

import { LoadingOutlined } from '@ant-design/icons';

import { CoinsIcon } from '@/components/icons';
import { Input } from '@/ui/molecules/input';
import { cn } from '@/utils/css-class';

const integerFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  useGrouping: true,
});

export function formatCreditsAmount(value: number | undefined) {
  if (!value) return '';
  return integerFormatter.format(value);
}

export function parseCreditsAmount(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return undefined;

  const parsed = Number.parseInt(digits, 10);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function CreditsAmountInput({
  className,
  disabled,
  hint,
  inputClassName,
  loadingHint = false,
  onValueChange,
  value,
}: {
  className?: string;
  disabled?: boolean;
  hint: string;
  inputClassName?: string;
  loadingHint?: boolean;
  onValueChange: (credits: number | undefined) => void;
  value: number | undefined;
}) {
  return (
    <div className={cn('rounded-lg border border-white/10 bg-white/5 p-4 text-white', className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="relative w-full">
            <Input
              id="credits"
              inputMode="numeric"
              pattern="[0-9,]*"
              value={formatCreditsAmount(value)}
              onChange={(event) => onValueChange(parseCreditsAmount(event.target.value))}
              placeholder="0"
              className={cn(
                'h-12 w-full rounded-full border-white/20 bg-[#052f66] pr-28 text-xl! font-bold text-white placeholder:text-white/50',
                '[appearance:textfield] border px-4 py-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                inputClassName
              )}
              disabled={disabled}
            />
            <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-base text-current">
              Credits
            </div>
          </div>
          <div className="mt-2 ml-2 flex items-center gap-2 text-current">
            <CoinsIcon className="h-5 w-5" />
            <span className="text-sm">
              {loadingHint ? <LoadingOutlined spin className="ml-2 text-current" /> : hint}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
