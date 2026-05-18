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
  discountPct,
  hint,
  inputClassName,
  loadingHint = false,
  onValueChange,
  value,
}: {
  className?: string;
  disabled?: boolean;
  discountPct?: number;
  hint: string;
  inputClassName?: string;
  loadingHint?: boolean;
  onValueChange: (credits: number | undefined) => void;
  value: number | undefined;
}) {
  const showSavePercent = discountPct != null && discountPct > 0;

  return (
    <div className={cn('rounded-lg  text-primary-9', className)}>
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
                'rounded-2xl min-h-14 text-xl! border-2 border-gray-100! bg-transparent! px-3 py-2 font-bold tracking-wide text-primary-9! focus:ring-0',
                'transition-[border-color,box-shadow] duration-200 ease-in-out',
                'hover:bg-transparent! hover:text-primary-9! focus:bg-transparent! focus:text-primary-9! [&_.ant-input-outlined]:bg-transparent!',
                'focus:border-pr placeholder:text-primary-9! hover:border-gray-200!',
                ' focus-within:border-gray-300! focus-visible:ring-0',
                '[&.ant-input-status-error]:border-1.5! [&.ant-XInput-status-error]:border-destructive!',
                '[&.ant-input-status-error]:border-1.5! [&.ant-input-status-error]:border-destructive!',
                inputClassName
              )}
              disabled={disabled}
            />
            <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-base text-current">
              Credits
            </div>
          </div>
          <div className="mt-2 ml-2 flex min-w-0 items-center justify-between gap-3 text-current">
            <div className="flex min-w-0 items-center gap-2">
              <CoinsIcon className="size-5 shrink-0" />
              <span className="truncate text-sm">
                {loadingHint ? <LoadingOutlined spin className="text-current" /> : hint}
              </span>
            </div>
            {showSavePercent ? (
              <span className="shrink-0 text-sm font-semibold text-emerald-700">
                You save {discountPct}%
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
