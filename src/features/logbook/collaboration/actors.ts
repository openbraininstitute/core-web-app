// Names come from the server's peer list; awareness only maps a client id to a user id.
import { isNotNil } from 'es-toolkit';

import { ActorVia } from '@/api/logbook/types';
import { colourOf } from '@/features/logbook/blocks/colour';
import { initialsOf } from '@/features/logbook/helpers';

import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { IPeer } from '@/features/logbook/collaboration/notices';
import type { IActor } from '@/features/logbook/ui/avatar';

type TAwareness = NonNullable<HocuspocusProvider['awareness']>;

export const UNKNOWN_ACTOR: IActor = {
  key: 'unknown',
  name: 'Someone',
  initials: '?',
  colour: '#595959',
  agent: false,
  ownerId: null,
};

// Labels are "<user>-<agent>", so "bob-claude" shows "BO".
export const agentInitialsOf = (label: string): string =>
  (label.split('-')[0] ?? '').slice(0, 2).toUpperCase();

export const personActor = (userId: string, name: string): IActor => ({
  key: userId,
  name,
  initials: initialsOf(name),
  colour: colourOf(userId),
  agent: false,
  ownerId: userId,
});

// Keyed by label: a person and the agent working as them share a user id but are two actors.
export const agentActor = (label: string, ownerId: string | null = null): IActor => ({
  key: `agent:${label}`,
  name: label,
  initials: agentInitialsOf(label),
  colour: colourOf(label),
  agent: true,
  ownerId,
});

export const peerActor = (peer: Pick<IPeer, 'userId' | 'label' | 'via'>): IActor =>
  peer.via === ActorVia.Agent
    ? agentActor(peer.label, peer.userId)
    : personActor(peer.userId, peer.label);

/** True for the person themself and for an agent known to work for them. */
export const worksFor = (actor: IActor, userId: string): boolean => actor.ownerId === userId;

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
  // The server's writer of a client: exact, and the only source for clients no longer online.
  readonly written: (clientId: number) => IActor | undefined;
}

export function resolveActor(clientId: number, sources: IActorSources): IActor {
  const userId = userIdIn(sources.awareness.getStates().get(clientId));
  const stored = sources.written(clientId);
  if (isNotNil(userId)) {
    const matches = sources.peers().filter((p) => p.userId === userId);
    const [only] = matches;
    if (matches.length === 1 && isNotNil(only)) return peerActor(only);
    // Several joins of one user (a person and their agent): awareness can't tell them apart.
    if (isNotNil(stored)) return stored;
    const person = matches.find((p) => p.via !== ActorVia.Agent) ?? only;
    if (isNotNil(person)) return peerActor(person);
  }
  if (isNotNil(stored)) return stored;
  // No socket means an HTTPS write, i.e. an agent; if only one is working, it's that one.
  const agents = sources.agents();
  const [one] = agents;
  if (agents.length === 1 && isNotNil(one)) return agentActor(one.label);
  return UNKNOWN_ACTOR;
}
