import { act } from '@testing-library/react';
import { vi } from 'vitest';

import { CircuitCells } from '@/features/circuit-viewer/morphologies/circuit-cells';
import { CircuitViewerSignals } from '@/features/circuit-viewer/signals';
import { MorphoViewerChrome } from '@/features/entities/cell-morphology/morpho-viewer/chrome/morpho-viewer-chrome';
import { EmViewerChrome } from '@/features/entities/em-cell-mesh/viewer/chrome/em-viewer-chrome';
import { FlagsProvider } from '@/features/feature-flags';
import { defaultFlags } from '@/features/feature-flags/config';
import { debugFlag } from '@/features/feature-flags/flags';

import type { ComponentProps } from 'react';
import type { CellColors, CircuitSomas } from '@/features/circuit-viewer/morphologies/types';

const LOOK = { id: 'look', colors: 'tint', plain: true };

function morpho(debug: boolean) {
  const props = {
    viewer: { looks: [LOOK] },
    root: null,
    settings: { look: 'look', dark: false, typeTint: true },
    actions: { update: vi.fn(), chooseLook: vi.fn() },
    mesh: { summary: null, layers: { mesh: null } },
    name: 'Cell',
    wheelHint: false,
    maxDistance: null,
    distanceError: null,
  } as unknown as ComponentProps<typeof MorphoViewerChrome>;
  return (
    <FlagsProvider flags={{ ...defaultFlags, [debugFlag.key]: debug }}>
      <MorphoViewerChrome {...props} />
    </FlagsProvider>
  );
}

function em(debug: boolean) {
  const props = {
    viewer: { looks: [LOOK] },
    root: null,
    settings: { look: 'look', dark: false, frameTimes: true },
    update: vi.fn(),
    chooseLook: vi.fn(),
    chooseColor: vi.fn(),
    load: {},
    name: 'Mesh',
    wheelHint: false,
  } as unknown as ComponentProps<typeof EmViewerChrome>;
  return (
    <FlagsProvider flags={{ ...defaultFlags, [debugFlag.key]: debug }}>
      <EmViewerChrome {...props} />
    </FlagsProvider>
  );
}

const SOMAS: CircuitSomas = {
  positions: Float32Array.of(0, 0, 0, 10, 0, 0),
  populations: [{ name: 'cortex', cells: 2 }],
};
const COLORS: CellColors = { palette: ['#ff0000'], columnByCell: Uint16Array.of(0, 0) };

/** The chrome offers the circuit's menu a place only with the flag on. */
function circuit(debug: boolean) {
  return (
    <CircuitCells
      somas={SOMAS}
      somaRadius={15}
      data={null}
      cellColors={COLORS}
      defaultColor="#2b5cd9"
      electrodeRadius={5}
      backgroundColor="#ffffff"
      showScalebar={false}
      signals={new CircuitViewerSignals()}
      debugTarget={debug ? document.body : null}
    />
  );
}

/** Each viewer with its Debug menus, on or off. */
export const VIEWERS = { morpho, em, circuit };

/** Long enough for a lazy import that should not happen, or that fails. */
export const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
