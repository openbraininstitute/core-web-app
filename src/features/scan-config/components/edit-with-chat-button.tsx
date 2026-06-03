'use client';

import { RiChatAiLine } from '@remixicon/react';
import { useSetAtom } from 'jotai';
import { useCallback } from 'react';

import { promptAtom } from '@/components/ai-assistant/state';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';

const DEFAULT_PROMPT = 'Help me complete an interesting configuration';

export function EditWithChatButton() {
  const { setState, isCollapsed } = usePanelState();
  const setPrompt = useSetAtom(promptAtom);

  const handleClick = useCallback(() => {
    if (isCollapsed) {
      setState(PanelState.Expanded);
    }
    setPrompt(DEFAULT_PROMPT);

    // Focus the chat textarea so the user can just press Enter to send.
    // Use requestAnimationFrame to wait for the panel to render if it was collapsed.
    requestAnimationFrame(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>(
        'textarea[data-testid="ai-chat-input"]'
      );
      textarea?.focus();
    });
  }, [isCollapsed, setState, setPrompt]);

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
