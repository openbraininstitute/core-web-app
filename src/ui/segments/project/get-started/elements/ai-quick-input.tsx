'use client';

import { useAtom, useAtomValue } from 'jotai';
import React, { useState } from 'react';

import { pendingAiPromptAtom } from '@/components/ai-assistant/state';
import SendIcon from '@/components/icons/Send';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { leftPaneViewAtom } from '@/ui/segments/project/get-started/elements/left-pane-view-atom';

export function AiQuickInput() {
  const view = useAtomValue(leftPaneViewAtom);
  const [, setPendingPrompt] = useAtom(pendingAiPromptAtom);
  const { setState } = usePanelState();
  const [value, setValue] = useState('');

  if (view !== 'tutorials') return null;

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setPendingPrompt(trimmed);
    setState(PanelState.Expanded);
    setValue('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="pointer-events-none absolute bottom-24 left-[60%] -translate-x-1/2 z-10 w-[min(23rem,calc(40%-4rem))]">
      <div className="pointer-events-auto bg-white/85 backdrop-blur-xl border border-neutral-2 rounded-2xl shadow-xl flex flex-col overflow-hidden transition-all hover:border-primary-5 focus-within:border-primary-7 focus-within:shadow-2xl">
        <header className="pl-3 pr-5 pt-5 pb-2 border-b border-neutral-2/70">
          <h3 className="text-primary-9 text-base font-bold tracking-wide">KEN-OBI AI</h3>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-end gap-2 px-4 py-3"
        >
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="How can I help you get started?"
            rows={2}
            className="flex-1 resize-none outline-none bg-transparent text-primary-9 placeholder:text-neutral-4 text-base leading-snug"
          />
          <button
            type="submit"
            disabled={!value.trim()}
            aria-label="Send to AI assistant"
            className="bg-primary-9 text-white p-2 rounded-full disabled:opacity-30 enabled:hover:bg-primary-8 transition-colors flex items-center justify-center shrink-0"
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default AiQuickInput;
