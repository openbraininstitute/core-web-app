'use client';

import { OTPInput, SlotProps } from 'input-otp';
import { classNames } from '@/util/utils';

function Slot({ isActive, char, placeholderChar, hasFakeCaret }: SlotProps) {
  return (
    <div
      className={classNames(
        'relative h-14 w-10 px-1 text-[2rem]',
        'flex items-center justify-center',
        'transition-all duration-300',
        'rounded-md border',
        'group-hover:border-accent-foreground/20 group-focus-within:border-accent-foreground/20',
        'outline-accent-foreground/20 outline outline-0',
        isActive && 'outline-accent-foreground outline-1'
      )}
    >
      <div className="group-has-[input[data-input-otp-placeholder-shown]]:opacity-20">
        {char ?? placeholderChar}
      </div>
      {hasFakeCaret && <Caret />}
    </div>
  );
}

function Caret() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="h-8 w-px bg-white" />
    </div>
  );
}

export default function VerificationCode({ onComplete }: { onComplete: (...args: any[]) => void }) {
  return (
    <OTPInput
      maxLength={6}
      containerClassName="group flex items-center has-[:disabled]:opacity-30"
      render={({ slots }) => (
        <div className="flex gap-1">
          {slots.slice(0, 6).map((slot, idx) => (
            // eslint-disable-next-line react/jsx-props-no-spreading
            <Slot key={`${slot.char}${idx}`} {...slot} /> // eslint-disable-line react/no-array-index-key
          ))}
        </div>
      )}
      onComplete={onComplete}
    />
  );
}
