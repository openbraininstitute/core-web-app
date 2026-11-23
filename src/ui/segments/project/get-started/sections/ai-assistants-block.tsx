'use client';

import { RiArrowRightLine, RiOpenaiFill, RiSparkling2Fill } from '@remixicon/react';
import Link from 'next/link';

import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { ClaudeLogo } from '@/ui/segments/project/get-started/ai-assistants/claude-logo';
import { cn } from '@/utils/css-class';

import type { ComponentType, ReactNode } from 'react';

const cardShadow =
  '-8px -8px 12px 0 rgba(255, 255, 255, 0.92), 6px 24px 20px -16px rgba(0, 0, 0, 0.09)';

const actionClassName =
  'text-primary-8 mt-auto flex shrink-0 flex-row items-center justify-between rounded-full border border-neutral-300 px-3 py-2 text-xs font-medium transition-colors';

function AssistantCard({
  icon: Icon,
  name,
  tag,
  description,
  action,
  muted,
  accent,
}: {
  icon: ComponentType<{ className?: string }>;
  name: string;
  tag: string;
  description: string;
  action: ReactNode;
  muted?: boolean;
  /** Draws the eye to this card: Claude's warm colour on the border, background and tag. */
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex h-full flex-col gap-3 rounded-lg border border-neutral-200 p-4',
        muted && 'opacity-70',
        accent &&
          'border-[#d97757]/60 bg-linear-to-br from-[#fbece5] via-white to-white transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_rgba(217,119,87,0.45)]!'
      )}
      style={{ boxShadow: cardShadow }}
    >
      <div className="flex flex-row items-center gap-3">
        <span
          className={cn(
            'bg-primary-0 text-primary-8 flex size-9 shrink-0 items-center justify-center rounded-full',
            accent && 'bg-white ring-1 ring-[#d97757]/30'
          )}
        >
          <Icon className="size-5" />
        </span>
        <h3 className="text-primary-8 text-base font-semibold">{name}</h3>
        <span
          className={cn(
            'text-primary-8 ml-auto rounded-full border border-neutral-300 px-2.5 py-0.5 text-[11px] font-normal uppercase tracking-[0.5px]',
            accent && 'border-[#d97757] bg-[#d97757] font-medium text-white'
          )}
        >
          {tag}
        </span>
      </div>
      <p className="text-primary-8 text-sm font-normal leading-normal">{description}</p>
      {action}
    </div>
  );
}

/** Where OBI can be used from: its own assistant here, and the outside assistants it plugs into. */
export function AiAssistantsBlock() {
  const { virtualLabId, projectId } = useWorkspace();
  const { setState } = usePanelState();

  return (
    <section className="flex shrink-0 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-primary-8 text-2xl font-bold">AI assistants</h2>
        <p className="text-primary-8 text-base font-normal">
          Work with OBI data, models and simulations from the assistant you prefer.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <AssistantCard
          icon={RiSparkling2Fill}
          name="OBI Assistant"
          tag="Built in"
          description="Ask questions right here on the platform. The assistant opens in the side panel and works in this project."
          action={
            <button
              type="button"
              onClick={() => setState(PanelState.Expanded)}
              className={cn(actionClassName, 'hover:bg-neutral-50')}
            >
              Open OBI Assistant
              <RiArrowRightLine className="size-3.5 shrink-0" />
            </button>
          }
        />
        <AssistantCard
          icon={ClaudeLogo}
          name="Claude"
          tag="New"
          accent
          description="Add the Open Brain Institute plugin to Claude and search data, build models and run simulations from your chats."
          action={
            <Link
              href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/ai-assistants/claude`}
              className={cn(
                actionClassName,
                'border-[#d97757] bg-[#d97757] text-white! hover:border-[#c4633f] hover:bg-[#c4633f] hover:text-white!'
              )}
            >
              Set up the Claude plugin
              <RiArrowRightLine className="size-3.5 shrink-0" />
            </Link>
          }
        />
        <AssistantCard
          icon={RiOpenaiFill}
          name="ChatGPT"
          tag="Coming soon"
          description="Use OBI from ChatGPT. Setup instructions are on their way."
          muted
          action={
            <span aria-disabled className={cn(actionClassName, 'cursor-not-allowed')}>
              Instructions coming soon
            </span>
          }
        />
      </div>
    </section>
  );
}
