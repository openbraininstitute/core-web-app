import { uniqBy } from 'es-toolkit';
import { match } from 'ts-pattern';

import { agentActor, peerActor } from '@/features/logbook/collaboration/actors';
import {
  PRESENCE_ACTIVE_MS,
  PRESENCE_AGENT_MS,
  PRESENCE_YOU_ACTIVE_MS,
} from '@/features/logbook/constants';
import { Status, ViewMode } from '@/features/logbook/types';

import type {
  IActor,
  IChangeSnapshot,
  ICollaborationSnapshot,
  IPresent,
  TStatus,
  TViewMode,
} from '@/features/logbook/types';

export const statusLooks: Readonly<Record<TStatus, { readonly fg: string; readonly dot: string }>> =
  {
    editing: { fg: 'var(--color-saved-fg)', dot: 'var(--color-saved-dot)' },
    writing: { fg: 'var(--color-writing-fg)', dot: 'var(--color-writing-dot)' },
    reading: { fg: 'var(--color-neutral-4)', dot: 'var(--color-neutral-3)' },
    idle: { fg: 'var(--color-neutral-4)', dot: 'var(--color-neutral-2)' },
  };

export function presentList(
  me: IActor,
  mode: TViewMode,
  live: ICollaborationSnapshot,
  changes: IChangeSnapshot,
  now: number
): IPresent[] {
  const seenWithin = (key: string, ms: number): boolean => now - (changes.seen[key] ?? 0) < ms;
  const you: IPresent = {
    actor: me,
    status: mode === ViewMode.Edit ? Status.Editing : Status.Reading,
    active: seenWithin(me.key, PRESENCE_YOU_ACTIVE_MS),
    you: true,
    sub: 'This tab',
  };
  const people = uniqBy(live.peers.map(peerActor), (actor) => actor.key)
    .filter((actor) => actor.key !== me.key)
    .map((actor): IPresent => {
      const { agent } = actor;
      const active = seenWithin(actor.key, PRESENCE_ACTIVE_MS);
      return {
        actor,
        status: match({ agent, active })
          .with({ agent: true, active: true }, () => Status.Writing)
          .with({ agent: true, active: false }, () => Status.Idle)
          .with({ agent: false, active: true }, () => Status.Editing)
          .with({ agent: false, active: false }, () => Status.Reading)
          .exhaustive(),
        active,
        you: false,
        sub: agent ? 'Agent' : 'Project member',
      };
    });
  const labels = new Set(live.agents.filter((a) => a.until > now).map((a) => a.label));
  for (const event of changes.events)
    if (event.actor.agent && now - event.at < PRESENCE_AGENT_MS) labels.add(event.actor.name);
  const listed = new Set(people.map((p) => p.actor.name));
  const agents = [...labels]
    .filter((label) => !listed.has(label))
    .map((label): IPresent => {
      const actor = agentActor(label);
      const active = seenWithin(actor.key, PRESENCE_ACTIVE_MS);
      return {
        actor,
        status: active ? Status.Writing : Status.Idle,
        active,
        you: false,
        sub: 'Agent',
      };
    });
  return [you, ...people, ...agents];
}

export const stackOrder = (present: readonly IPresent[]): IPresent[] =>
  present.toSorted((a, b) => Number(b.active) - Number(a.active));

export function summaryOf(present: readonly IPresent[]): string {
  const agents = present.filter((p) => p.actor.agent).length;
  const people = present.length - agents;
  const peopleText = `${people} ${people === 1 ? 'person' : 'people'}`;
  return agents === 0
    ? peopleText
    : `${peopleText} · ${agents} ${agents === 1 ? 'agent' : 'agents'}`;
}

export const whoLabelOf = (present: readonly IPresent[]): string =>
  `${present.length} here: ${present.map((p) => p.actor.name).join(', ')}`;
