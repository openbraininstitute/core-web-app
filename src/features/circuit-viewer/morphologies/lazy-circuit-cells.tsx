'use client';

import dynamic from 'next/dynamic';

import { VisualizationLoadingIndicator } from '@/features/scan-config/components/shared/visualization-loading-indicator';

/** `CircuitCells`, fetched with three.js on the client alone, the spinner on show until it is in. */
export const LazyCircuitCells = dynamic(
  () => import('./circuit-cells').then((m) => m.CircuitCells),
  { ssr: false, loading: () => <VisualizationLoadingIndicator /> }
);
