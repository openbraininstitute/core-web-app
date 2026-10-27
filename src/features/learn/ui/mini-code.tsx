'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/utils/css-class';

/*
 * The Python course's small picture: a tiny editor that types out print("Hello, brain"), runs it,
 * shows what it printed, and starts again. Laid out at 180px and scaled down into the square, so
 * the code keeps its proportions at any size. It only watches: the card takes the clicks.
 */

const CODE = 'print("Hello, brain")';
const OUTPUT = 'Hello, brain';
/** The layout size, px, before it is scaled. */
const BOX = 180;
/** Per character typed, ms; then the pauses: before it runs, showing the output, and blank. */
const TYPE_MS = 95;
const RUN_AT = CODE.length * TYPE_MS + 450;
const SHOW_MS = 2200;
const LOOP_MS = RUN_AT + SHOW_MS + 500;

/** The code so far, coloured as an editor would: the function, the brackets, the string. */
function Highlighted({ text }: { text: string }) {
  const fn = text.slice(0, Math.min(text.length, 5));
  const open = text.slice(5, 6);
  const str = text.slice(6, Math.min(text.length, CODE.length - 1));
  const close = text.slice(CODE.length - 1);
  return (
    <>
      <span className="text-[#4fc1ff]">{fn}</span>
      <span className="text-[#ffd700]">{open}</span>
      <span className="text-[#ce9178]">{str}</span>
      <span className="text-[#ffd700]">{close}</span>
    </>
  );
}

export function MiniCode({ size, className }: { size: number; className?: string }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setT(RUN_AT + 1);
      return;
    }
    const start = performance.now();
    const id = window.setInterval(() => setT((performance.now() - start) % LOOP_MS), 50);
    return () => window.clearInterval(id);
  }, []);

  const typed = CODE.slice(0, Math.min(CODE.length, Math.floor(t / TYPE_MS)));
  const ran = t >= RUN_AT && t < RUN_AT + SHOW_MS;
  const cursorOn = Math.floor(t / 450) % 2 === 0 || typed.length < CODE.length;

  return (
    <span
      aria-hidden="true"
      className={cn('pointer-events-none relative block shrink-0 overflow-hidden', className)}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute top-0 left-0 flex origin-top-left flex-col bg-[#0b1220] font-mono"
        style={{ width: BOX, height: BOX, transform: `scale(${size / BOX})` }}
      >
        {/* the window's bar */}
        <span className="flex items-center gap-[6px] bg-[#111a2e] px-[12px] py-[9px]">
          <span className="size-[9px] rounded-full bg-[#ff5f57]" />
          <span className="size-[9px] rounded-full bg-[#febc2e]" />
          <span className="size-[9px] rounded-full bg-[#28c840]" />
          <span className="ml-auto text-[11px] text-white/40">brain.py</span>
        </span>
        {/* 21 characters of 12.5px monospace, ~7.5px each, fit the 180px with 10px either side */}
        <span className="flex flex-1 flex-col justify-center gap-[14px] px-[10px]">
          <span className="text-[12.5px] leading-[20px] whitespace-nowrap text-white">
            <Highlighted text={typed} />
            <span
              className={cn(
                'ml-px inline-block h-[15px] w-[7px] translate-y-[3px] bg-[#69c0ff]',
                cursorOn ? 'opacity-100' : 'opacity-0'
              )}
            />
          </span>
          <span
            className={cn(
              'rounded-[6px] bg-white/[0.06] px-[10px] py-[7px] text-[13px] leading-[19px] transition-opacity duration-300',
              ran ? 'opacity-100' : 'opacity-0'
            )}
          >
            <span className="text-[#28c840]">› </span>
            <span className="text-[#e2e8f0]">{OUTPUT}</span>
          </span>
        </span>
      </span>
    </span>
  );
}
