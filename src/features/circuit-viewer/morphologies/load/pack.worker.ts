/** Opens a circuit's morphology pack, from its cache or entitycore, and reads its boxes as asked, until terminated. */
import * as Comlink from 'comlink';

import { createPackApi, STORED_PACK_CACHE } from './worker-api';

Comlink.expose(createPackApi(STORED_PACK_CACHE));
