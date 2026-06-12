'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { type UseLowCreditsOptions, useLowCredits } from './use-low-credits';

import type { ComponentProps } from 'react';

type ButtonProps = ComponentProps<typeof Button>;

export type LowCreditsRunButtonProps = Omit<ButtonProps, 'onClick'> &
  Pick<UseLowCreditsOptions, 'context' | 'subject' | 'messages' | 'watchBalance'> & {
    /**
     * The action to run when the button is clicked. Insufficient-credits
     * failures (preemptively via `watchBalance`, or thrown by `onRun`) are
     * caught and surfaced through the shared low-credits notification + modal.
     */
    onRun: () => void | Promise<void>;
    /** Called for any error that is *not* a low-credits error. */
    onError?: (error: unknown) => void;
  };

export function LowCreditsRunButton({
  context,
  subject,
  messages,
  watchBalance,
  onRun,
  onError,
  disabled,
  children,
  ...buttonProps
}: LowCreditsRunButtonProps) {
  const { guard, reportError, creditsModal } = useLowCredits({
    context,
    subject,
    messages,
    watchBalance,
  });
  const [isRunning, setIsRunning] = useState(false);

  const handleClick = async () => {
    if (isRunning) return;
    if (guard()) return;

    setIsRunning(true);
    try {
      await onRun();
    } catch (error) {
      if (!reportError(error)) onError?.(error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      <Button {...buttonProps} disabled={disabled || isRunning} onClick={handleClick}>
        {children}
        {isRunning && <LoadingOutlined />}
      </Button>
      {creditsModal}
    </>
  );
}
