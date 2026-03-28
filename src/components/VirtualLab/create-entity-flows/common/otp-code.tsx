'use client';

import { OTPInput, type SlotProps } from 'input-otp';

import { cn } from '@/utils/css-class';

import type { RefObject } from 'react';

type Props = {
  disabled: boolean;
  onChange: (v: string) => void;
  onComplete: (...args: any[]) => void;
  cls?: { container?: string; slot?: string; caret: string };
  ref?: RefObject<HTMLInputElement | null>;
};

export function VerificationCode({ disabled = false, onComplete, cls, ref, onChange }: Props) {
  return (
    <OTPInput
      ref={ref}
      autoFocus
      inputMode="numeric"
      maxLength={6}
      disabled={disabled}
      containerClassName="group flex items-center has-disabled:opacity-50"
      render={({ slots }) => (
        <div className="flex gap-1">
          {slots.slice(0, 6).map((slot, idx) => (
            <Slot
              key={`${slot.char}${idx}`}
              cls={{ caret: cls?.caret, container: cls?.slot }}
              {...slot}
            />
          ))}
        </div>
      )}
      onChange={onChange}
      onComplete={onComplete}
    />
  );
}
export default VerificationCode;

function Slot({
  isActive,
  char,
  placeholderChar,
  hasFakeCaret,
  cls,
}: SlotProps & { cls?: { container?: string; caret?: string } }) {
  return (
    <div
      className={cn(
        'relative h-14 w-10 px-1 text-[2rem]',
        'flex items-center justify-center',
        'transition-all duration-300',
        'rounded-md border',
        'group-hover:border-accent-foreground/20 group-focus-within:border-accent-foreground/20',
        'outline-accent-foreground/20 outline-0',
        { 'outline-accent-foreground outline-1': isActive },
        cls?.container
      )}
    >
      <div className="group-has-[input[data-input-otp-placeholder-shown]]:opacity-20">
        {char ?? placeholderChar}
      </div>
      {hasFakeCaret && <Caret className={cls?.caret} />}
    </div>
  );
}

function Caret({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 flex items-center justify-center',
        className
      )}
    >
      <div id="caret" className="h-8 w-px bg-primary-7" />
    </div>
  );
}
