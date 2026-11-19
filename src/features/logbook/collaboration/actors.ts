// Names come from the server's peer list; awareness only maps a client id to a user id.
import { isNotNil } from 'es-toolkit';

import { ActorVia } from '@/api/logbook/types';
import { colourOf } from '@/features/logbook/blocks/colour';
import { initialsOf } from '@/features/logbook/ui/initials';

import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { IPeer } from '@/features/logbook/collaboration/notices';
import type { IActor } from '@/features/logbook/ui/Avatar';

type TAwareness = NonNullable<HocuspocusProvider['awareness']>;

export const UNKNOWN_ACTOR: IActor = {
  key: 'unknown',
  name: 'Someone',
  initials: '?',
  colour: '#595959',
  agent: false,
};

// Labels are "<user>-<agent>", so "bob-claude" shows "BO".
export const agentInitialsOf = (label: string): string =>
  (label.split('-')[0] ?? '').slice(0, 2).toUpperCase();

export const personActor = (userId: string, name: string, agent = false): IActor => ({
  key: userId,
  name,
  initials: agent ? agentInitialsOf(name) : initialsOf(name),
  colour: colourOf(userId),
  agent,
});

// The `present` notice has no user id yet, only the label.
export const agentActor = (label: string): IActor => ({
  key: `agent:${label}`,
  name: label,
  initials: agentInitialsOf(label),
  colour: colourOf(label),
  agent: true,
});

const userIdIn = (state: Record<string, unknown> | undefined): string | null => {
  const user: unknown = state?.['user'];
  const id: unknown =
    typeof user === 'object' && isNotNil(user) ? Reflect.get(user, 'userId') : null;
  return typeof id === 'string' ? id : null;
};

export interface IActorSources {
  readonly awareness: TAwareness;
  readonly peers: () => readonly IPeer[];
  readonly agents: () => readonly { readonly label: string }[];
  // For clients no longer online.
  readonly written: (clientId: number) => IActor | undefined;
}

export function resolveActor(clientId: number, sources: IActorSources): IActor {
  const userId = userIdIn(sources.awareness.getStates().get(clientId));
  if (isNotNil(userId)) {
    const peer = sources.peers().find((p) => p.userId === userId);
    if (isNotNil(peer)) return personActor(peer.userId, peer.label, peer.via === ActorVia.Agent);
  }
  const stored = sources.written(clientId);
  if (isNotNil(stored)) return stored;
  // No socket means an HTTPS write, i.e. an agent; if only one is working, it's that one.
  const agents = sources.agents();
  const [only] = agents;
  if (agents.length === 1 && isNotNil(only)) return agentActor(only.label);
  return UNKNOWN_ACTOR;
}
