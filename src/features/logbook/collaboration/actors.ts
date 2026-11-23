import { isNotNil } from 'es-toolkit';

import { ActorVia } from '@/api/logbook/types';
import { colourOf } from '@/features/logbook/blocks/colour';
import { initialsOf } from '@/features/logbook/helpers';

import type { IActor, IActorSources, IPeer } from '@/features/logbook/types';

export const UNKNOWN_ACTOR: IActor = {
  key: 'unknown',
  name: 'Someone',
  initials: '?',
  colour: '#595959',
  agent: false,
  ownerId: null,
};

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

export const worksFor = (actor: IActor, userId: string): boolean => actor.ownerId === userId;

const userIdIn = (state: Record<string, unknown> | undefined): string | null => {
  const user: unknown = state?.['user'];
  const id: unknown =
    typeof user === 'object' && isNotNil(user) ? Reflect.get(user, 'userId') : null;
  return typeof id === 'string' ? id : null;
};

export function resolveActor(clientId: number, sources: IActorSources): IActor {
  const userId = userIdIn(sources.awareness.getStates().get(clientId));
  const stored = sources.written(clientId);
  if (isNotNil(userId)) {
    const matches = sources.peers().filter((p) => p.userId === userId);
    const [only] = matches;
    if (matches.length === 1 && isNotNil(only)) return peerActor(only);
    if (isNotNil(stored)) return stored;
    const person = matches.find((p) => p.via !== ActorVia.Agent) ?? only;
    if (isNotNil(person)) return peerActor(person);
  }
  if (isNotNil(stored)) return stored;
  const agents = sources.agents();
  const [one] = agents;
  if (agents.length === 1 && isNotNil(one)) return agentActor(one.label);
  return UNKNOWN_ACTOR;
}
