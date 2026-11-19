// Who is on the page and what they do: people from the server's `peers` list,
// agents from their `present` notices and their changes, statuses from the last change seen.
import { uniqBy } from 'es-toolkit';

import { ActorVia } from '@/api/logbook/types';
import { agentActor, personActor } from '@/features/logbook/collaboration/actors';
import { ViewMode } from '@/features/logbook/log/view-mode';

import type { TValueOf } from '@/api/logbook/types';
import type { IChangeSnapshot } from '@/features/logbook/collaboration/changes';
import type { ICollaborationSnapshot } from '@/features/logbook/collaboration/notices';
import type { TViewMode } from '@/features/logbook/log/view-mode';
import type { IActor } from '@/features/logbook/ui/Avatar';

export const Status = {
  Editing: 'editing',
  Writing: 'writing',
  Reading: 'reading',
  Idle: 'idle',
} as const;
export type TStatus = TValueOf<typeof Status>;

export const statusLooks: Readonly<Record<TStatus, { readonly fg: string; readonly dot: string }>> =
  {
    editing: { fg: '#166534', dot: '#16a34a' },
    writing: { fg: '#5b21b6', dot: '#7c3aed' },
    reading: { fg: '#595959', dot: '#bfbfbf' },
    idle: { fg: '#595959', dot: '#d9d9d9' },
  };

export interface IPresent {
  readonly actor: IActor;
  readonly status: TStatus;
  readonly active: boolean;
  readonly you: boolean;
  readonly sub: string;
}

const ACTIVE_MS = 2500;
const YOU_ACTIVE_MS = 3000;
const AGENT_PRESENCE_MS = 30_000;

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
    active: seenWithin(me.key, YOU_ACTIVE_MS),
    you: true,
    sub: 'This tab',
  };
  const people = uniqBy(live.peers, (p) => p.userId)
    .filter((peer) => peer.userId !== me.key)
    .map((peer): IPresent => {
      const agent = peer.via === ActorVia.Agent;
      const actor = personActor(peer.userId, peer.label, agent);
      const active = seenWithin(actor.key, ACTIVE_MS);
      return {
        actor,
        status: agent
          ? active
            ? Status.Writing
            : Status.Idle
          : active
            ? Status.Editing
            : Status.Reading,
        active,
        you: false,
        sub: agent ? 'Agent' : 'Project member',
      };
    });
  // Agents over HTTPS: a present notice, or a change in the last 30 s.
  const labels = new Set(live.agents.filter((a) => a.until > now).map((a) => a.label));
  for (const event of changes.events)
    if (event.actor.agent && now - event.at < AGENT_PRESENCE_MS) labels.add(event.actor.name);
  const listed = new Set(people.map((p) => p.actor.name));
  const agents = [...labels]
    .filter((label) => !listed.has(label))
    .map((label): IPresent => {
      const actor = agentActor(label);
      const active = seenWithin(actor.key, ACTIVE_MS);
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

// Active first, in a stable order.
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
