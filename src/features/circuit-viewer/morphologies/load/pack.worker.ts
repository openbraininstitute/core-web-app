/** Opens a circuit's morphology pack, from its cache, OBI-One or entitycore, and reads its boxes as asked, until terminated. */
import * as Comlink from 'comlink';

import { createPackApi, PACK_CACHE, STORED_PACK_CACHE } from './worker-api';

Comlink.expose(createPackApi(PACK_CACHE, STORED_PACK_CACHE));
