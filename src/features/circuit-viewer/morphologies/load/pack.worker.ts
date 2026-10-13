/** Fetches a circuit's morphology pack into its cache and reads it; terminated after. */
import * as Comlink from 'comlink';

import { createPackApi, PACK_CACHE } from './worker-api';

Comlink.expose(createPackApi(PACK_CACHE));
