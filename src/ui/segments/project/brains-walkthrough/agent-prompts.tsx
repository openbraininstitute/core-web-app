'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import { AGENTS } from './agent-ready';

/** What is asked of each agent, in its own prompt box, and what the platform is to it there. */
const PROMPTS = [
  {
    agent: 'Claude',
    label: 'Claude',
    tool: 'OBI connector',
    text: 'Build a model of the fly brain and register it in my OBI project',
    placeholder: 'How can I help you today?',
  },
  {
    agent: 'OpenAI',
    label: 'ChatGPT',
    tool: 'OBI plugin',
    text: 'Run a simulation campaign to generate predictions about which neurons respond to pheromone-detecting cells',
    placeholder: 'Ask anything',
  },
  {
    agent: 'OBI',
    label: 'OBI Assistant',
    tool: 'Built into the platform',
    text: 'Plot the spike raster of my last simulation and compare the firing rates of each cell type',
    placeholder: 'Ask the OBI Assistant',
  },
] as const;

/**
 * How long each box takes to connect to the platform, ms; how fast its prompt is typed, a character; how long
 * it stays once typed, before it is sent; and after.
 */
const CONNECT_MS = 1100;
const TYPE_MS = 34;
const HOLD_MS = 1300;
const SENT_MS = 700;

type TPhase = 'connecting' | 'typing' | 'sent';

const mark = (name: string) => AGENTS.find((agent) => agent.name === name);

/** The platform's mark, small, as a chip carries it. */
function ObiMark() {
  return (
    <span className="flex h-[16px] items-center rounded-[4px] bg-[#002766] px-[4px] text-[8px] leading-none font-bold tracking-[0.06em] text-white">
      OBI
    </span>
  );
}

/**
 * Three prompt boxes, as Claude's, ChatGPT's and the platform's own OBI Assistant's, each in turn connecting to
 * the platform, by its OBI connector or plugin, or built in, typing what someone asks of it, sending it, and
 * handing over to the next, round and round; from the start each time they come into view. On a phone, one at a
 * time in one place, whose turn it is: three, with room for what is typed, are taller than the screen.
 */
export function AgentPrompts() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [state, setState] = useState<{ box: number; phase: TPhase; typed: number }>({
    box: 0,
    phase: 'connecting',
    typed: 0,
  });
  // Which boxes have connected once: they stay connected while the other has its turn.
  const [connected, setConnected] = useState<boolean[]>(PROMPTS.map(() => false));

  // From the top whenever it comes into view; still while it is not.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const watch = new IntersectionObserver(([entry]) => {
      setSeen(entry?.isIntersecting ?? false);
      if (entry?.isIntersecting) {
        setState({ box: 0, phase: 'connecting', typed: 0 });
        setConnected(PROMPTS.map(() => false));
      }
    });
    watch.observe(root);
    return () => watch.disconnect();
  }, []);

  useEffect(() => {
    if (!seen) return;
    const { box, phase, typed } = state;
    const length = PROMPTS[box].text.length;
    const step = (): [number, () => void] => {
      if (phase === 'connecting') {
        return [
          // The platform's own assistant has nothing to connect to.
          PROMPTS[box].agent === 'OBI' ? 0 : CONNECT_MS,
          () => {
            setConnected((was) => was.map((on, i) => on || i === box));
            setState({ box, phase: 'typing', typed: 0 });
          },
        ];
      }
      if (phase === 'typing') {
        if (typed < length) {
          return [typed === 0 ? 450 : TYPE_MS, () => setState({ box, phase, typed: typed + 1 })];
        }
        return [HOLD_MS, () => setState({ box, phase: 'sent', typed })];
      }
      return [
        SENT_MS,
        () => setState({ box: (box + 1) % PROMPTS.length, phase: 'connecting', typed: 0 }),
      ];
    };
    const [wait, then] = step();
    const timer = setTimeout(then, wait);
    return () => clearTimeout(timer);
  }, [seen, state]);

  return (
    <div
      ref={rootRef}
      data-agent-prompts
      // Beside the stage, ending a gutter short of the multiplying brains' canvas (the stage's 62% of the page,
      // that canvas inset from it), less the column's own left padding.
      className="flex flex-col gap-[12px] pt-[4px] pb-[6px] beside:max-w-[calc(38vw_+_clamp(16px,4vw,72px)_-_clamp(32px,5vw,88px)_-_24px)] stacked:grid squat:grid"
    >
      {PROMPTS.map((prompt, i) => {
        const on = i === state.box;
        const connecting = on && state.phase === 'connecting' && prompt.agent !== 'OBI';
        const plugged = connected[i] || prompt.agent === 'OBI';
        const typed = on && state.phase !== 'connecting' ? prompt.text.slice(0, state.typed) : '';
        const sending = on && state.phase === 'sent';
        const { path, evenOdd } = mark(prompt.agent) ?? { path: '', evenOdd: false };
        const claude = prompt.agent === 'Claude';
        const obi = prompt.agent === 'OBI';
        return (
          <div
            key={prompt.agent}
            data-agent-prompt
            className={cn(
              'flex flex-col gap-[8px] border bg-white px-[16px] pt-[12px] pb-[10px] shadow-[0_6px_22px_rgba(0,39,102,0.07)] transition-[border-color,box-shadow,opacity] duration-300',
              'stacked:col-start-1 stacked:row-start-1 squat:col-start-1 squat:row-start-1',
              !on && 'stacked:opacity-0 squat:opacity-0',
              claude
                ? 'rounded-[16px] border-[#e8e3d9]'
                : obi
                  ? 'rounded-[14px] border-[#002766]/20'
                  : 'rounded-[24px] border-[#e3e3e3]',
              on && 'shadow-[0_8px_28px_rgba(0,39,102,0.12)]'
            )}
          >
            <div className="flex items-center gap-[8px] text-[12px] leading-[16px] font-medium text-neutral-500">
              {obi ? (
                <ObiMark />
              ) : (
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="size-[16px]"
                  fill={claude ? '#D97757' : '#0d0d0d'}
                >
                  <title>{prompt.label}</title>
                  <path d={path} fillRule={evenOdd ? 'evenodd' : undefined} />
                </svg>
              )}
              {prompt.label}
            </div>
            <p
              className={cn(
                'min-h-[20px] text-[14px] leading-[20px] transition-opacity duration-300 stacked:min-h-[60px] squat:min-h-[60px]',
                typed ? 'text-[#1f1e1d]' : 'text-neutral-400',
                sending && 'opacity-40'
              )}
            >
              {typed || prompt.placeholder}
              {on && state.phase === 'typing' && (
                <span className="ml-[1px] inline-block h-[16px] w-[2px] translate-y-[3px] animate-pulse bg-[#1f1e1d]" />
              )}
            </p>
            <div className="flex items-center justify-between gap-[12px]">
              {/* The platform plugged in: connecting as the box's turn starts, connected from then on. */}
              <span
                className={cn(
                  'flex items-center gap-[7px] rounded-full border px-[8px] py-[3px] text-[11px] leading-[16px] transition-[border-color,background-color,color,opacity] duration-300',
                  connecting
                    ? 'border-[#002766]/25 bg-[#f2f5fa] text-[#002766]'
                    : plugged
                      ? 'border-neutral-200 bg-white text-neutral-600'
                      : 'border-neutral-200 bg-white text-neutral-400 opacity-70'
                )}
              >
                <ObiMark />
                {connecting ? `Connecting to ${prompt.tool}…` : prompt.tool}
                {connecting ? (
                  <span className="size-[10px] animate-spin rounded-full border-[1.5px] border-[#002766] border-t-transparent" />
                ) : (
                  plugged && <span className="size-[7px] rounded-full bg-[#22a06b]" />
                )}
              </span>
              <span
                aria-hidden
                className={cn(
                  'flex size-[30px] shrink-0 items-center justify-center text-white transition-[transform,opacity] duration-200',
                  claude
                    ? 'rounded-[9px] bg-[#D97757]'
                    : obi
                      ? 'rounded-[8px] bg-[#002766]'
                      : 'rounded-full bg-[#0d0d0d]',
                  typed ? 'opacity-100' : 'opacity-30',
                  sending && 'scale-90'
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-[16px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <title>Send prompt</title>
                  <path d="M12 19V5M6 11l6-6 6 6" />
                </svg>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
