import { RiArrowRightSLine, RiContrastDrop2Line } from '@remixicon/react';
import { useRef, useState } from 'react';

import { viewerTheme } from '@/features/scan-config/components/color-by/contrast';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';

import { besideRow, type Placement } from '../help/beside-row';
import { HelpRow, ICON } from './menu-rows';
import { focusChosen, PillOption } from './pill-option';

import type { Look } from '../engine/looks';
import type { HelpText } from '../help/help-button';

const LIGHT = viewerTheme(false);
/** The look list's width (`w-72`), px. */
const LOOKS_WIDTH = 288;

/** The look, from a list beside the menu that gives the line describing each. */
export function LookSelect({
  looks,
  look,
  onChange,
  help,
  testId,
}: {
  looks: Look[];
  look: Look;
  onChange(id: string): void;
  help: HelpText;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Placement>({ side: 'right', sideOffset: 0, alignOffset: 0 });
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <HelpRow title="Look" topic="look" help={help} icon={<RiContrastDrop2Line className={ICON} />}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next && trigger.current) setPlace(besideRow(trigger.current, LOOKS_WIDTH));
          setOpen(next);
        }}
      >
        <PopoverTrigger
          ref={trigger}
          data-testid={testId}
          aria-label={`Look: ${look.label}`}
          className="inline-flex items-center gap-0.5 rounded-full bg-neutral-100 py-1 pr-1 pl-2.5 text-xs font-medium text-primary-9 transition-colors hover:bg-neutral-200"
        >
          {look.label}
          <RiArrowRightSLine className="size-4" />
        </PopoverTrigger>
        <PopoverContent
          {...place}
          align="start"
          collisionPadding={8}
          className="w-72 rounded-xl border-neutral-200 bg-white p-1 text-neutral-700 shadow-xl"
          onOpenAutoFocus={focusChosen}
        >
          <ul className="max-h-[min(30rem,calc(100vh-6rem))] overflow-y-auto" aria-label="Looks">
            {looks.map((l) => (
              <PillOption
                key={l.id}
                label={l.label}
                detail={l.hint}
                selected={l.id === look.id}
                theme={LIGHT}
                onClick={() => {
                  onChange(l.id);
                  setOpen(false);
                }}
              />
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </HelpRow>
  );
}
