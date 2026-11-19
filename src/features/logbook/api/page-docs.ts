// The text of a page on the logbook server, as Yjs V1 updates: the adapter of local-sync.ts's
// IPageDocs port.
import { readPageDoc, sendPageDoc } from '@/api/logbook/queries/page';

import type { IPageDocs } from '@/features/logbook/collaboration/local-sync';

export const pageDocs: IPageDocs = { read: readPageDoc, send: sendPageDoc };
