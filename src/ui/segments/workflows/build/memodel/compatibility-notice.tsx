'use client';

import {
  ExclamationCircleOutlined,
  LoadingOutlined,
  RightOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useState } from 'react';

import { messages } from '@/i18n/en/me-model';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { CompatibilityState } from './compatibility-state';

type Props = {
  state: CompatibilityState;
  onRetry: () => void;
};

export function CompatibilityNotice({ state, onRetry }: Props) {
  if (state.kind === 'checking') {
    return (
      <div className="text-primary-9 flex items-center gap-3 p-4 pl-6 font-semibold">
        <LoadingOutlined />
        {messages.CheckingCompatibility}
      </div>
    );
  }

  if (state.kind === 'incompatible') {
    return (
      <Notice
        className="text-destructive"
        icon={<ExclamationCircleOutlined />}
        message={messages.IncompatibleModels}
        detail={state.detail}
      />
    );
  }

  if (state.kind === 'check_failed') {
    return (
      <Notice
        className="text-warning"
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
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn('flex flex-col gap-2 p-4 pl-6', className)}>
      <div className="flex items-start gap-3 font-semibold">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <span>{message}</span>
      </div>

      {detail && (
        <>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
            className="flex w-fit items-center gap-1.5 text-sm underline-offset-2 hover:underline"
          >
            <RightOutlined className={cn('text-[10px]', expanded && 'rotate-90')} />
            {expanded ? messages.CompatibilityDetailsHide : messages.CompatibilityDetailsShow}
          </button>

          {expanded && (
            <pre className="border-neutral-2 text-neutral-7 max-h-56 overflow-auto rounded-md border bg-white/60 p-3 font-mono text-xs whitespace-pre-wrap">
              {detail}
            </pre>
          )}
        </>
      )}

      {action}
    </div>
  );
}
