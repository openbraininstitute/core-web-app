'use client';

import { RiArrowRightLine } from '@remixicon/react';

import { useAssistantQuestion } from './use-assistant-question';

import type { TObiAssistantTopic } from '@/ui/segments/project/get-started/query';

function AnimatedDots() {
  const dotStyle = (delay: string): React.CSSProperties => ({
    width: 4,
    height: 4,
    minWidth: 4,
    minHeight: 4,
    borderRadius: '50%',
    animation: `dotBounce 0.6s ease-in-out infinite ${delay}`,
  });

  return (
    <div className="border-neutral-300 bg-neutral-100 flex w-12 items-end gap-1.5 rounded-lg border p-3">
      <div className="bg-neutral-7" style={dotStyle('0ms')} />
      <div className="bg-neutral-7" style={dotStyle('0.2s')} />
      <div className="bg-neutral-7" style={dotStyle('0.4s')} />
      <style>{`
        @keyframes dotBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

export function ObiAssistantCard({ topic }: { topic: TObiAssistantTopic }) {
  const { sendQuestion } = useAssistantQuestion();

  return (
    <div className="flex h-full flex-col gap-2">
      <h4 className="text-primary-8 shrink-0 text-sm font-semibold">{topic.title}</h4>
      <div
        className="flex flex-1 flex-col gap-2 rounded-lg border border-neutral-200 p-3"
        style={{
          boxShadow:
            '-8px -8px 12px 0 rgba(255, 255, 255, 0.92), 6px 24px 20px -16px rgba(0, 0, 0, 0.09)',
        }}
      >
        <div className="ml-auto w-[70%]">
          <div className="bg-neutral-1 rounded-lg px-3 py-2">
            <p className="text-primary-8 text-xs font-normal leading-normal">{topic.question}</p>
          </div>
        </div>
        <div className="mt-auto">
          <AnimatedDots />
        </div>
        <button
          type="button"
          onClick={() => sendQuestion(topic.question)}
          className="text-primary-8 flex shrink-0 flex-row items-center justify-between rounded-full border border-neutral-300 px-3 py-2 text-xs font-medium transition-colors hover:bg-neutral-50"
        >
          Try in Assistant
          <RiArrowRightLine className="size-3.5 shrink-0" />
        </button>
      </div>
    </div>
  );
}
