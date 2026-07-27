import { match } from 'ts-pattern';

import {
  CircuitScaleDictionary,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';

import { SmallCircuitLoaderKind, type TSmallCircuitLoaderKind } from './types';

/**
 * Pick the morphology data strategy for a circuit scale.
 *
 * - {@link SmallCircuitLoaderKind.ObiOneVisualization}: pair / small — server MorphIO, axon filtering
 * - {@link SmallCircuitLoaderKind.SonataAsset}: single — client SONATA + SWC (OBI-One rejects `single`)
 *
 * Larger scales use {@link MorphoViewerSomasOnly} and never reach this helper.
 */
export function resolveSmallCircuitLoaderKind(
  scale: TCircuitScaleDictionary
): TSmallCircuitLoaderKind {
  return match(scale)
    .with(CircuitScaleDictionary.Single, () => SmallCircuitLoaderKind.SonataAsset)
    .otherwise(() => SmallCircuitLoaderKind.ObiOneVisualization);
}

/** Axon toggle requires OBI-One morph section filtering — not available on SONATA/SWC. */
export function loaderSupportsAxonToggle(kind: TSmallCircuitLoaderKind): boolean {
  return match(kind)
    .with(SmallCircuitLoaderKind.ObiOneVisualization, () => true)
    .with(SmallCircuitLoaderKind.SonataAsset, () => false)
    .exhaustive();
}
