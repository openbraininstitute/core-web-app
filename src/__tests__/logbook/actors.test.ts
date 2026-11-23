import { expect, test } from 'vitest';

import {
  agentActor,
  peerActor,
  resolveActor,
  UNKNOWN_ACTOR,
  worksFor,
} from '@/features/logbook/collaboration/actors';

import type { IActorSources } from '@/features/logbook/types';

const LIVE = 1;
const GONE = 2;
const NOBODY = 3;

const sources = (agents: readonly { readonly label: string }[]): IActorSources => ({
  awareness: { getStates: () => new Map([[LIVE, { user: { userId: 'u-bob' } }]]) } as never,
  peers: () => [{ userId: 'u-bob', label: 'bob', via: 'ui' }] as never,
  agents: () => agents,
  written: (id) =>
    id === GONE ? peerActor({ userId: 'u-alice', label: 'alice', via: 'ui' }) : undefined,
});

test('a writer is named by the live page first, then by the server, then guessed', () => {
  const one = sources([{ label: 'alice-claude' }]);
  expect(resolveActor(LIVE, one).name).toBe('bob');
  expect(resolveActor(GONE, one).name).toBe('alice');
  expect(resolveActor(NOBODY, one).name).toBe('alice-claude');
  expect(resolveActor(NOBODY, sources([]))).toBe(UNKNOWN_ACTOR);
});

test('a stored agent writer is an agent', () => {
  const agent = peerActor({
    userId: 'u',
    label: 'u-claude',
    via: 'agent',
  });
  expect(agent).toMatchObject({ name: 'u-claude', agent: true, initials: 'U' });
  expect(agentActor('bob-claude').initials).toBe('BO');
});

test('an agent keeps the person it works for, and never shares that person’s key', () => {
  const agent = peerActor({ userId: 'u-bob', label: 'bob-claude', via: 'agent' });
  expect(worksFor(agent, 'u-bob')).toBe(true);
  expect(worksFor(agent, 'u-alice')).toBe(false);
  expect(agent.key).not.toBe('u-bob');
  expect(worksFor(agentActor('bob-claude'), 'u-bob')).toBe(false);
});

test('a person and their socket agent share a user id; the server’s writer names each client', () => {
  const PERSON = 10;
  const AGENT = 11;
  const shared: IActorSources = {
    awareness: {
      getStates: () =>
        new Map([
          [PERSON, { user: { userId: 'u-bob' } }],
          [AGENT, { user: { userId: 'u-bob' } }],
        ]),
    } as never,
    peers: () => [
      { joinId: 'j2', userId: 'u-bob', label: 'bob-claude', via: 'agent' },
      { joinId: 'j1', userId: 'u-bob', label: 'bob', via: 'ui' },
    ],
    agents: () => [],
    written: (id) =>
      id === AGENT ? peerActor({ userId: 'u-bob', label: 'bob-claude', via: 'agent' }) : undefined,
  };
  expect(resolveActor(AGENT, shared)).toMatchObject({ name: 'bob-claude', agent: true });
  expect(resolveActor(PERSON, shared)).toMatchObject({ name: 'bob', agent: false });
});
