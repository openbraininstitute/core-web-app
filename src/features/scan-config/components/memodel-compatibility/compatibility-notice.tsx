'use client';

import { ExclamationCircleOutlined, LoadingOutlined, WarningOutlined } from '@ant-design/icons';

import { messages } from '@/i18n/en/me-model';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { CompatibilityState } from './compatibility-state';

type Props = {
  state: CompatibilityState;
  onRetry: () => void;
  className?: string;
};

export function CompatibilityNotice({ state, onRetry, className }: Props) {
  if (state.kind === 'checking') {
    return (
      <div className={cn('text-primary-9 flex items-center gap-3 font-semibold', className)}>
        <LoadingOutlined />
        {messages.CheckingCompatibility}
      </div>
    );
  }

  if (state.kind === 'incompatible') {
    return (
      <Notice
        className={cn('text-destructive', className)}
        icon={<ExclamationCircleOutlined />}
        message={messages.IncompatibleModels}
        detail={state.detail}
      />
    );
  }

  if (state.kind === 'check_failed') {
    return (
      <Notice
        className={cn('text-warning', className)}
        icon={<WarningOutlined />}
        message={messages.CompatibilityCheckFailed}
        detail={state.detail}
        action={
          <Button rounded variant="outline" size="sm" onClick={onRetry} className="self-start">
            {messages.CompatibilityRetry}
          </Button>
        }
      />
    );
  }

  return null;
}

type NoticeProps = {
  className: string;
  icon: React.ReactNode;
  message: string;
  detail?: string;
  action?: React.ReactNode;
};

function Notice({ className, icon, message, detail, action }: NoticeProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-start gap-3 font-semibold">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <span>{message}</span>
      </div>

      {detail && (
        <pre className="border-neutral-2 text-neutral-7 max-h-56 overflow-auto rounded-md border bg-white/60 p-3 font-mono text-xs whitespace-pre-wrap">
          {detail}
        </pre>
      )}

      {action}
    </div>
  );
}
