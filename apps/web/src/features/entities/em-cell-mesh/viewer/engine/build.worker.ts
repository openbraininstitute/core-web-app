/** Splits and packs the full mesh; terminated after. */
import * as Comlink from 'comlink';

import { buildApi } from './worker-apis';

Comlink.expose(buildApi);
