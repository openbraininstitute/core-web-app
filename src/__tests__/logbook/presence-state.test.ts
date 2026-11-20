import { expect, test } from 'vitest';

import { personActor } from '@/features/logbook/collaboration/actors';
import { presentList } from '@/features/logbook/log/presence-state';
import { ViewMode } from '@/features/logbook/log/view-mode';

import type { ICollaborationSnapshot } from '@/features/logbook/collaboration/notices';

const live = (peers: ICollaborationSnapshot['peers']): ICollaborationSnapshot => ({
  peersSeq: 1,
  peers,
  savedAt: null,
  pageSavedAt: null,
  agents: [],
  readOnly: null,
  rejoinAt: null,
});

test('my own agent on a socket is listed next to me, and my other tab is not', () => {
  const me = personActor('u-me', 'Me');
  const present = presentList(
    me,
    ViewMode.Edit,
    live([
      { joinId: 'j1', userId: 'u-me', label: 'Me', via: 'ui' }, // this tab
      { joinId: 'j2', userId: 'u-me', label: 'Me', via: 'ui' }, // another tab of mine
      { joinId: 'j3', userId: 'u-me', label: 'me-claude', via: 'agent' },
      { joinId: 'j4', userId: 'u-ann', label: 'Ann', via: 'ui' },
    ]),
    { events: [], toast: null, seen: {} },
    0
  );
  expect(present.map((p) => [p.actor.name, p.actor.agent])).toEqual([
    ['Me', false],
    ['me-claude', true],
    ['Ann', false],
  ]);
});
