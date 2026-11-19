import { expect, test } from 'vitest';

import { actorOfWriter } from '@/features/logbook/api/writers';
import { agentActor, resolveActor, UNKNOWN_ACTOR } from '@/features/logbook/collaboration/actors';

import type { IActorSources } from '@/features/logbook/collaboration/actors';

const LIVE = 1; // a client of a peer on the page now
const GONE = 2; // a client whose writer left; the server named it
const NOBODY = 3;

const sources = (agents: readonly { readonly label: string }[]): IActorSources => ({
  awareness: { getStates: () => new Map([[LIVE, { user: { userId: 'u-bob' } }]]) } as never,
  peers: () => [{ userId: 'u-bob', label: 'bob', via: 'ui' }] as never,
  agents: () => agents,
  written: (id) =>
    id === GONE ? actorOfWriter({ userId: 'u-alice', label: 'alice', via: 'ui' }) : undefined,
});

test('a writer is named by the live page first, then by the server, then guessed', () => {
  const one = sources([{ label: 'alice-claude' }]);
  expect(resolveActor(LIVE, one).name).toBe('bob');
  expect(resolveActor(GONE, one).name).toBe('alice'); // not the agent at work now
  expect(resolveActor(NOBODY, one).name).toBe('alice-claude'); // the one agent at work
  expect(resolveActor(NOBODY, sources([]))).toBe(UNKNOWN_ACTOR);
});

test('a stored agent writer is an agent', () => {
  const agent = actorOfWriter({
    userId: 'u',
    label: 'u-claude',
    via: 'agent',
  });
  expect(agent).toMatchObject({ name: 'u-claude', agent: true, initials: 'U' });
  // The person it works for, two letters, as the log list shows.
  expect(agentActor('bob-claude').initials).toBe('BO');
});
