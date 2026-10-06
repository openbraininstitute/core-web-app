'use client';

import { useEffect, useRef, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';

import { besideRow, type Placement } from './beside-row';

import styles from './help-button.module.css';

const OPEN_DELAY = 250;
const CLOSE_DELAY = 120;
/** The card's width (`w-75`), px. */
const CARD_WIDTH = 300;

type State = 'closed' | 'peek' | 'pinned';

/** What the help card of a control says. */
export interface HelpText {
  text: string;
  /** What a change does, each under a short key: "Higher" and "Lower", "On" and "Off", or a menu's options. */
  effects?: [string, string][];
  /** A change shows at once in the view only, or rebuilds the mesh: the card says so. Not for a section's card. */
  applies?: 'view' | 'build';
}

/**
 * A "?" after a label, with a card that says what the control does. The card opens while the pointer rests on the
 * button or a keyboard focuses it, and stays open after a click until the next click elsewhere or Escape. It sits
 * beside the nearest `data-help-anchor` (a row of a menu), so it covers the view and not the other controls.
 */
export function HelpButton({
  topic,
  title,
  help,
}: {
  /** Names the card for tests. */
  topic: string;
  title: string;
  help: HelpText;
}) {
  const [state, setState] = useState<State>('closed');
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);
  // Offsets from the button that put the card beside its row: a custom Radix anchor would do
  // it, but the trigger it replaces is remounted, and the popper keeps measuring the old one.
  const [place, setPlace] = useState<Placement>({ side: 'right', sideOffset: 0, alignOffset: 0 });

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const open = (next: 'peek' | 'pinned') => {
    if (button.current) setPlace(besideRow(button.current, CARD_WIDTH));
    setState(next);
  };
  const later = (next: State, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => (next === 'closed' ? setState(next) : open(next)), ms);
  };
  const peek = () => state !== 'pinned' && later('peek', OPEN_DELAY);
  const unpeek = () => {
    if (state === 'peek') later('closed', CLOSE_DELAY);
    // Left before the card came up: it does not.
    else if (state === 'closed') window.clearTimeout(timer.current);
  };

  return (
    <Popover
      open={state !== 'closed'}
      onOpenChange={(open) => {
        if (open) return;
        window.clearTimeout(timer.current);
        setState('closed');
      }}
    >
      <PopoverTrigger asChild>
        <button
          ref={button}
          type="button"
          className={styles.help}
          data-help={topic}
          data-pinned={state === 'pinned' || undefined}
          aria-label={`About ${title}`}
          onPointerEnter={(e) => e.pointerType === 'mouse' && peek()}
          onPointerLeave={(e) => e.pointerType === 'mouse' && unpeek()}
          onFocus={(e) => {
            if (state === 'closed' && e.currentTarget.matches(':focus-visible')) open('peek');
          }}
          onBlur={unpeek}
          onClick={(e) => {
            // Ours, not the trigger's toggle: a click pins a peeking card.
            e.preventDefault();
            window.clearTimeout(timer.current);
            if (state === 'pinned') setState('closed');
            else open('pinned');
          }}
        >
          ?
        </button>
      </PopoverTrigger>
      <PopoverContent
        {...place}
        align="start"
        collisionPadding={8}
        className="w-75 border-neutral-2 bg-white px-3.5 py-3 text-[12.5px] leading-[1.45] text-neutral-9"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerEnter={() => state === 'peek' && window.clearTimeout(timer.current)}
        onPointerLeave={unpeek}
      >
        <HelpCard title={title} help={help} />
      </PopoverContent>
    </Popover>
  );
}

function HelpCard({ title, help }: { title: string; help: HelpText }) {
  return (
    <>
      <div className="mb-1 text-[13px] font-semibold">{title}</div>
      <p className="m-0">{help.text}</p>
      {help.effects && (
        <dl className="mt-2 mb-0 grid grid-cols-[fit-content(96px)_1fr] gap-x-2.5 gap-y-1">
          {help.effects.map(([what, effect]) => (
            <div key={what} className="contents">
              <dt className="pt-px text-[11px] font-semibold tracking-wide text-neutral-4">
                {what}
              </dt>
              <dd className="m-0">{effect}</dd>
            </div>
          ))}
        </dl>
      )}
      {help.applies && (
        <div className={styles.applies} data-applies={help.applies}>
          {help.applies === 'build' ? 'Builds the mesh again' : 'Changes the view only, at once'}
        </div>
      )}
    </>
  );
}
