import { expect, test } from 'vitest';

import { collaborationUrl } from '@/api/logbook/utils';
import { config } from '@/config';

// The only guard against the web app going back to the bare /v1/collaboration: the load test
// uses its own provider, and these tests have no DOM.
test('the collaboration socket is the page socket: /v1/collaboration/<page id>, so the router hashes it', () => {
  const socketBase = String(config.LOGBOOK_URL).replace(/^http/, 'ws');
  const pageId = '019a0000-0000-7000-8000-000000000001';
  expect(collaborationUrl(pageId)).toBe(`${socketBase}/v1/collaboration/${pageId}`);
  expect(collaborationUrl('a/b')).toBe(`${socketBase}/v1/collaboration/a%2Fb`);
});
