import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchObiOneJsonSchema, fetchSchema } from '@/features/scan-config/components/hooks/schema';
import { ScanConfigUIElementDict, SchemaNameDict } from '@/features/scan-config/types';

const circuitSchema = {
  properties: {
    initialize: {
      ui_element: ScanConfigUIElementDict.BlockSingle,
      properties: {},
    },
  },
};

const openApiDocument = {
  openapi: '3.1.0',
  components: {
    schemas: {
      [SchemaNameDict.CircuitSimulationScanConfig]: circuitSchema,
    },
  },
};

describe('scan-config API integration paths', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches and dereferences the requested ObiOne scan-config schema', async () => {
    const fetchMock = vi.fn(async () => Response.json(openApiDocument));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchSchema({ schemaName: SchemaNameDict.CircuitSimulationScanConfig })
    ).resolves.toEqual(circuitSchema);

    expect(fetchMock).toHaveBeenCalledWith('https://obi-one.test/openapi.json');
  });

  it('uses the query client path when one is provided', async () => {
    const fetchMock = vi.fn(async () => Response.json(openApiDocument));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient();

    const schema = await fetchObiOneJsonSchema({
      qc: queryClient,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
    });

    expect(schema).toEqual(circuitSchema);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await fetchObiOneJsonSchema({
      qc: queryClient,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
