'use client';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { cn } from '@/utils/css-class';

/**
 * The AI assistant's button: a circle that opens the panel, and closes it; navy only while the
 * panel is open (the user asked), white with a navy ring while it is shut.
 */
export function AiButton() {
  const { isCollapsed, setState } = usePanelState();
  const breakpoint = useDefaultBreakpoint();
  return (
    <button
      type="button"
      // where the onboarding tour points for the assistant, as the panel is gone while closed
      id="workspace-ai-button"
      onClick={() => setState(isCollapsed ? PanelState.Expanded : PanelState.Collapsed)}
      aria-label={isCollapsed ? 'Open the AI assistant' : 'Close the AI assistant'}
      aria-expanded={!isCollapsed}
      title="OBI Assistant"
      data-testid="ai-assistant-open-button"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold tracking-[0.5px] transition-all select-none active:scale-95',
        breakpoint === 'xl' ? 'size-12 text-[15px]' : 'size-10 text-[13px]',
        isCollapsed
          ? 'text-primary-9 border-primary-9/30 hover:border-primary-9 border-[1.5px] bg-white hover:bg-[#f4f7fc]'
          : 'bg-primary-9 hover:bg-primary-8 text-white shadow-md hover:shadow-[0_4px_14px_rgba(0,39,102,0.35)]'
      )}
    >
      AI
    </button>
  );
}
