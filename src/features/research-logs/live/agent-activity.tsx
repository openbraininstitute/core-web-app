'use client';

import { useEffect, useState } from 'react';

import { AGENT_CHANGE_MS, type AgentChange } from './use-agent-activity';

/**
 * The tint on an agent's new text, in the editor and in the rendered report: strong at first,
 * gone by the time the change stops being announced.
 */
export function AgentHighlightStyle() {
  return (
    <style>{`
@keyframes rl-agent-new {
  0%, 35% { background-color: rgb(124 58 237 / 0.18); box-shadow: -4px 0 0 0 rgb(124 58 237 / 0.85); }
  100% { background-color: rgb(124 58 237 / 0); box-shadow: -4px 0 0 0 rgb(124 58 237 / 0); }
}
.rl-agent-new { animation: rl-agent-new ${AGENT_CHANGE_MS}ms ease-out forwards; border-radius: 6px; }
div.rl-agent-new { margin: 0 -8px; padding: 0 8px; }
.cm-content .rl-agent-new { box-shadow: none; border-radius: 3px; }
`}</style>
  );
}

const sentence = (change: AgentChange) =>
  `${change.by} ${change.summary.charAt(0).toLowerCase()}${change.summary.slice(1)}`;

function ago(at: number, now: number) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  return s < 5 ? 'just now' : `${s}s ago`;
}

/** What the agent just did, over the foot of the report, with the way to its text. */
export function AgentActivityToast({
  changes,
  onShow,
}: {
  changes: AgentChange[];
  onShow: () => void;
}) {
  const latest = changes[changes.length - 1];
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!latest) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [latest]);
  if (!latest) return null;
  const more = changes.length - 1;

  return (
    <div
      role="status"
      className="pointer-events-auto absolute bottom-5 left-1/2 z-30 flex max-w-[min(42rem,calc(100%-2rem))] -translate-x-1/2 items-center gap-3 rounded-full bg-violet-600 py-2 pr-2 pl-4 text-sm text-white shadow-lg"
    >
      <span aria-hidden className="text-base">
        ✦
      </span>
      <span className="min-w-0 truncate">
        <span className="font-semibold">{sentence(latest)}</span>
        {more > 0 && <span className="text-violet-200"> and {more} more</span>}
        <span className="text-violet-200"> · {ago(latest.at, now)}</span>
      </span>
      {latest.ranges.length > 0 && (
        <button
          type="button"
          onClick={onShow}
          className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-50"
        >
          Show
        </button>
      )}
    </div>
  );
}
