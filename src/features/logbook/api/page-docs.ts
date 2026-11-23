import { readPageDoc, sendPageDoc } from '@/api/logbook/queries/page';

import type { IPageDocs } from '@/features/logbook/types';

export const pageDocs: IPageDocs = { read: readPageDoc, send: sendPageDoc };
