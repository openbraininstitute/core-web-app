import { useRef, useState } from 'react';

import { DESCRIPTION_TOOLTIP_CLASS } from '@/features/scan-config/components/shared/box-class';
import { isScanHintTarget } from '@/features/scan-config/components/shared/scan-hint';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';

import type { ReactElement, ReactNode } from 'react';

/**
 * A field's description, shown while the field is hovered or focused.
 *
 * A scan + inside the field closes it, and it stays shut while the + is hovered
 * or focused and when focus moves on from a + (into the value it just added),
 * so the +'s hint and this description never stack. It opens again on the next
 * hover or focus of the field.
 */
export function FieldDescriptionTooltip({
  content,
  children,
}: {
  content: ReactNode;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  // Refs, not state: Radix asks to open from handlers that run before a re-render.
  const hintHovered = useRef(false);
  const hintFocused = useRef(false);
  const setHint = (hovered: boolean, focused: boolean) => {
    hintHovered.current = hovered;
    hintFocused.current = focused;
    if (hovered || focused) setOpen(false);
  };

  return (
    <Tooltip
      open={open}
      onOpenChange={(next) => setOpen(next && !hintHovered.current && !hintFocused.current)}
    >
      <TooltipTrigger
        asChild
        onPointerOver={(e) => setHint(isScanHintTarget(e.target), hintFocused.current)}
        onPointerLeave={() => setHint(false, hintFocused.current)}
        onFocus={(e) => {
          const toHint = isScanHintTarget(e.target);
          // Skips Radix's open-on-focus, which runs after this handler.
          if (!toHint && (hintHovered.current || hintFocused.current)) e.preventDefault();
          setHint(hintHovered.current, toHint);
        }}
        onBlur={(e) => {
          // Checked once focus has landed: a + that unmounts as it adds a value
          // drops focus to the page before the new value takes it.
          const field = e.currentTarget;
          setTimeout(() => {
            if (!field.contains(document.activeElement)) setHint(hintHovered.current, false);
          });
        }}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        avoidCollisions
        hideWhenDetached
        align="center"
        side="right"
        showArrow={false}
        className={DESCRIPTION_TOOLTIP_CLASS}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
