import { readPageDoc, sendPageDoc } from '@/api/logbook/queries/page';

import type { IPageDocs } from '@/features/logbook/collaboration/local-sync';

export const pageDocs: IPageDocs = { read: readPageDoc, send: sendPageDoc };
