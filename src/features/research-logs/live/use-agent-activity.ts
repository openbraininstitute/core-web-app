'use client';

import { useEffect, useState } from 'react';
import * as Y from 'yjs';

import type { LiveLog } from './use-live-log';

/** How long an agent's edit is announced, and its text marked, after it lands. */
export const AGENT_CHANGE_MS = 15_000;

export type AgentChange = {
  id: number;
  by: string;
  summary: string;
  at: number;
  /** The text it put in, held as positions that move with later edits. */
  ranges: { from: Y.RelativePosition; to: Y.RelativePosition }[];
};

export type TextRange = { from: number; to: number };

let seq = 0;

/**
 * The agent's recent edits to the shared text. The server writes each one's summary into the
 * document's 'activity' map in the same transaction as the text, which is how a browser tells the
 * agent's text from a colleague's.
 */
export function useAgentActivity(live: LiveLog | null): AgentChange[] {
  const [changes, setChanges] = useState<AgentChange[]>([]);
  const ready = !!live?.ready;
  const text = live?.text;
  const doc = live?.doc;

  useEffect(() => {
    if (!ready || !text || !doc) return;
    const activity = doc.getMap('activity');
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const onText = (event: Y.YTextEvent, tr: Y.Transaction) => {
      // `changed` is keyed by type; a map is one, its generics aside
      const withSummary = [...tr.changed.keys()].some((type) => type === (activity as unknown));
      if (tr.local || !withSummary) return;
      const last = activity.get('last') as { by: string; summary: string; at: number } | undefined;
      // an old one arriving with a reconnection is not news
      if (!last || Date.now() - last.at > AGENT_CHANGE_MS) return;
      const ranges: AgentChange['ranges'] = [];
      let index = 0;
      for (const step of event.delta) {
        if (step.retain) index += step.retain;
        else if (typeof step.insert === 'string') {
          ranges.push({
            from: Y.createRelativePositionFromTypeIndex(text, index),
            to: Y.createRelativePositionFromTypeIndex(text, index + step.insert.length, -1),
          });
          index += step.insert.length;
        }
      }
      seq += 1;
      const change = { id: seq, ...last, ranges };
      setChanges((current) => [...current.slice(-4), change]);
      const timer = setTimeout(() => {
        timers.delete(timer);
        setChanges((current) => current.filter((c) => c.id !== change.id));
      }, AGENT_CHANGE_MS);
      timers.add(timer);
    };
    text.observe(onText);
    return () => {
      text.unobserve(onText);
      timers.forEach(clearTimeout);
    };
  }, [ready, text, doc]);

  return changes;
}

/** Where the changes' text is now, as offsets into the shared text. */
export function agentRanges(changes: AgentChange[], doc: Y.Doc | undefined): TextRange[] {
  if (!doc) return [];
  return changes.flatMap((change) =>
    change.ranges.flatMap(({ from, to }) => {
      const start = Y.createAbsolutePositionFromRelativePosition(from, doc)?.index;
      const end = Y.createAbsolutePositionFromRelativePosition(to, doc)?.index;
      return start === undefined || end === undefined || end <= start
        ? []
        : [{ from: start, to: end }];
    })
  );
}
