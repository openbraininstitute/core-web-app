import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useScanConfiguration } from '@/features/scan-config/components/hooks/use-scan-configuration';
import {
  ScanConfigActivity,
  SchemaNameDict,
  type TScanConfigActivity,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { extractCircuitConfigureBinding } from '@/ui/segments/workflows/config/scan-config-binding';

vi.mock('@/features/scan-config/components/atoms', () => ({
  useModelQuery: () => ({ entity: undefined, isLoading: false, error: null }),
}));
vi.mock('@/features/scan-config/components/hooks/schema', () => ({
  useObioneJsonSchema: ({ schemaName }: { schemaName?: string }) => ({
    schema: schemaName ? {} : undefined,
    isLoading: false,
  }),
  useSchemaMappingConfiguration: () => ({ data: undefined, isLoading: false }),
}));

const brian2Circuit = {
  id: 'flywire',
  type: 'circuit',
  scale: 'whole_brain',
  target_simulator: 'Brian2',
} as unknown as TSupportedEntitiesForScanConfiguration;

const nestCircuit = {
  id: 'simplified-nbs1',
  type: 'circuit',
  scale: 'small',
  target_simulator: 'NEST',
} as unknown as TSupportedEntitiesForScanConfiguration;

function render(activity: TScanConfigActivity, entity = brian2Circuit) {
  return renderHook(() =>
    useScanConfiguration({
      entity,
      virtualLabId: 'vl',
      projectId: 'p',
      activity,
      scanConfig: {
        configureBinding: extractCircuitConfigureBinding(),
        schemaName: SchemaNameDict.CircuitExtractionScanConfig,
      },
    })
  ).result.current.ready;
}

describe('useScanConfiguration target_simulator override', () => {
  it('keeps the extraction form for a Brian2 circuit', () => {
    const ready = render(ScanConfigActivity.Extract);
    expect(ready?.schemaName).toBe(SchemaNameDict.CircuitExtractionScanConfig);
    expect(ready?.generatedEndpoint).toMatch(/circuit-extraction-scan-config-generate-grid$/);
  });

  it('switches a Brian2 circuit to the Brian2 form when simulating', () => {
    const ready = render(ScanConfigActivity.Simulate);
    expect(ready?.schemaName).toBe(SchemaNameDict.Brian2CircuitSimulationScanConfig);
  });

  it('switches a NEST circuit to the NEST form and endpoint when simulating', () => {
    const ready = render(ScanConfigActivity.Simulate, nestCircuit);
    expect(ready?.schemaName).toBe(SchemaNameDict.NestCircuitSimulationScanConfig);
    expect(ready?.generatedEndpoint).toMatch(
      /\/nest-circuit-simulation-scan-config-generate-grid$/
    );
  });

  it('keeps the extraction form for a NEST circuit', () => {
    const ready = render(ScanConfigActivity.Extract, nestCircuit);
    expect(ready?.schemaName).toBe(SchemaNameDict.CircuitExtractionScanConfig);
  });
});
