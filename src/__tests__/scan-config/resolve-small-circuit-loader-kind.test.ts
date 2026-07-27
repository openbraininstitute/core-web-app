import { describe, expect, it } from 'vitest';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import {
  loaderSupportsAxonToggle,
  resolveSmallCircuitLoaderKind,
} from '@/features/scan-config/components/circuit-viz/sources/resolve-loader-kind';
import { SmallCircuitLoaderKind } from '@/features/scan-config/components/circuit-viz/sources/types';

describe('resolveSmallCircuitLoaderKind', () => {
  it('uses the client SONATA asset for single-scale circuits', () => {
    expect(resolveSmallCircuitLoaderKind(CircuitScaleDictionary.Single)).toBe(
      SmallCircuitLoaderKind.SonataAsset
    );
  });

  it('uses OBI-One viz for pair and small microcircuits', () => {
    expect(resolveSmallCircuitLoaderKind(CircuitScaleDictionary.PairNeuron)).toBe(
      SmallCircuitLoaderKind.ObiOneVisualization
    );
    expect(resolveSmallCircuitLoaderKind(CircuitScaleDictionary.SmallMicrocircuit)).toBe(
      SmallCircuitLoaderKind.ObiOneVisualization
    );
  });

  it('defaults larger scales to OBI-One (callers should not use this helper for them)', () => {
    expect(resolveSmallCircuitLoaderKind(CircuitScaleDictionary.Region)).toBe(
      SmallCircuitLoaderKind.ObiOneVisualization
    );
  });
});

describe('loaderSupportsAxonToggle', () => {
  it('is only available for OBI-One morphologies', () => {
    expect(loaderSupportsAxonToggle(SmallCircuitLoaderKind.ObiOneVisualization)).toBe(true);
    expect(loaderSupportsAxonToggle(SmallCircuitLoaderKind.SonataAsset)).toBe(false);
  });
});
