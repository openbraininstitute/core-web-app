'use client';

import { RiChatAiLine } from '@remixicon/react';
import { useSetAtom } from 'jotai';
import { useCallback } from 'react';

import { draftPromptAtom } from '@/components/ai-assistant/state';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';

const DEFAULT_PROMPT = 'Help me complete this configuration and suggest improvements';

export function EditWithChatButton() {
  const { setState, isCollapsed } = usePanelState();
  const setDraftPrompt = useSetAtom(draftPromptAtom);

  const handleClick = useCallback(() => {
    if (isCollapsed) {
      setState(PanelState.Expanded);
    }

    setTimeout(
      () => {
        setDraftPrompt(DEFAULT_PROMPT);
      },
      isCollapsed ? 350 : 0
    );
  }, [isCollapsed, setState, setDraftPrompt]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1 text-[11px] text-gray-500 transition-colors hover:text-primary-6"
    >
      <RiChatAiLine className="h-4 w-4 mb-1" />
      <span>Ask AI</span>
    </button>
  );
}
