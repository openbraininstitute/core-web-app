import * as Comlink from 'comlink';

import { createMesherApi } from './mesher-api';

Comlink.expose(createMesherApi());
