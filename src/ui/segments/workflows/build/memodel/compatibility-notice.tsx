'use client';

import {
  CheckOutlined,
  CopyOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  RightOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useState } from 'react';

import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { messages } from '@/i18n/en/me-model';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { CompatibilityState } from './compatibility-state';

type Props = {
  state: CompatibilityState;
  onRetry: () => void;
};

/**
 * Explains why a combination was rejected instead of only saying that it was.
 * The detail is NEURON's own wording, so it is shown verbatim behind a disclosure
 * rather than paraphrased.
 */
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
        tone="destructive"
        icon={<ExclamationCircleOutlined />}
        message={messages.IncompatibleModels}
        detail={state.details ?? state.summary}
      />
    );
  }

  if (state.kind === 'check-failed') {
    return (
      <Notice
        tone="warning"
        icon={<WarningOutlined />}
        message={messages.CompatibilityCheckFailed}
        detail={state.details ?? state.summary}
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
  tone: 'destructive' | 'warning';
  icon: React.ReactNode;
  message: string;
  detail?: string;
  action?: React.ReactNode;
};

function Notice({ tone, icon, message, detail, action }: NoticeProps) {
  const [expanded, setExpanded] = useState(false);
  const [, copy, , copying] = useCopyToClipboard();

  const toneClass = tone === 'destructive' ? 'text-destructive' : 'text-warning';

  return (
    <div className={cn('flex flex-col gap-2 p-4 pl-6', toneClass)}>
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
            {expanded ? (
              <DownOutlined className="text-[10px]" />
            ) : (
              <RightOutlined className="text-[10px]" />
            )}
            {expanded ? messages.CompatibilityDetailsHide : messages.CompatibilityDetailsShow}
          </button>

          {expanded && (
            <div className="flex flex-col gap-1.5">
              <pre className="border-neutral-2 text-neutral-7 max-h-56 overflow-auto rounded-md border bg-white/60 p-3 font-mono text-xs whitespace-pre-wrap">
                {detail}
              </pre>
              <button
                type="button"
                onClick={() => copy(detail)}
                className="flex w-fit items-center gap-1.5 text-sm underline-offset-2 hover:underline"
              >
                {copying ? <CheckOutlined /> : <CopyOutlined />}
                {messages.CompatibilityDetailsCopy}
              </button>
            </div>
          )}
        </>
      )}

      {action}
    </div>
  );
}
