import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useSetScanConfigSettingsPanel } from '@/features/scan-config/bridge/settings-panel';
import { FloatOptional } from '@/features/scan-config/components/ui-elements/float-optional';
import { ProtocolCard } from '@/features/scan-config/components/ui-elements/select-efeatures-by-protocol/protocol-card';

import type {
  TFeatureDef,
  TProtocolDef,
  TProtocolValue,
} from '@/features/scan-config/components/ui-elements/select-efeatures-by-protocol/types';

// The e2e suite addresses this widget by test id alone: a protocol by its
// discriminator, an amplitude by its value. Both are what the fixture already
// carries, so nothing there has to know a label. The row's id carries a `-row-`
// segment so that matching the prefix cannot also match the boxes inside it.

const FEATURE: TFeatureDef = {
  typeName: 'VoltageBaseFeature',
  label: 'Voltage base',
  efelName: 'voltage_base',
  category: 'subthreshold',
  docAnchor: null,
  description: null,
  overrideFields: [],
  schema: {},
};

const PROTOCOL: TProtocolDef = {
  typeName: 'IDRestProtocol',
  label: 'IDRest',
  description: null,
  timingFields: [],
  overrideFields: [],
  featureDefs: [FEATURE],
  schema: {},
};

const VALUE: TProtocolValue = {
  type: 'IDRestProtocol',
  extraction_amplitudes: [[0.103, false]],
  features: [{ type: 'VoltageBaseFeature' }],
};

/** Publishes the mount point the right column would, so the settings panel can portal into it. */
function PanelSlot() {
  const setPanel = useSetScanConfigSettingsPanel();
  const slot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPanel({ slot: slot.current });
  }, [setPanel]);

  return <div ref={slot} />;
}

function renderCard() {
  render(
    <>
      <PanelSlot />
      <ProtocolCard
        def={PROTOCOL}
        catalogueDefs={[FEATURE]}
        value={VALUE}
        expanded
        disabled={false}
        discoveredAmplitudes={[0.103]}
        docUrlFor={() => null}
        renderField={() => null}
        onToggleSelected={vi.fn()}
        onToggleExpanded={vi.fn()}
        onChange={vi.fn()}
        onResetFeatures={vi.fn()}
      />
    </>
  );
}

describe('e-feature picker test ids', () => {
  it('names a protocol, its toggles and its features by discriminator', () => {
    renderCard();

    expect(screen.getByTestId('scan-config-protocol-IDRestProtocol')).toBeInTheDocument();
    expect(screen.getByTestId('scan-config-protocol-expand-IDRestProtocol')).toBeInTheDocument();
    expect(screen.getByTestId('scan-config-protocol-settings-IDRestProtocol')).toBeInTheDocument();
    expect(screen.getByTestId('scan-config-feature-remove-VoltageBaseFeature')).toBeInTheDocument();
    expect(
      screen.getByTestId('scan-config-feature-settings-VoltageBaseFeature')
    ).toBeInTheDocument();
  });

  // The id has to reach the input, not the label around it: a test ticks the box.
  it('puts the selection id on the checkbox itself', () => {
    renderCard();

    expect(screen.getByTestId('scan-config-protocol-select-IDRestProtocol')).toHaveAttribute(
      'type',
      'checkbox'
    );
  });

  it('names each amplitude by its value, with its two boxes apart', () => {
    renderCard();

    fireEvent.click(screen.getByTestId('scan-config-protocol-settings-IDRestProtocol'));

    const amplitudes = screen.getByTestId('scan-config-amplitudes');
    const row = screen.getByTestId('scan-config-amplitude-row-0.103');

    expect(amplitudes).toContainElement(row);
    expect(screen.getByTestId('scan-config-amplitude-extract')).toBeChecked();
    expect(screen.getByTestId('scan-config-amplitude-validation')).not.toBeChecked();
  });

  it('names the value and the way back to unset on an optional number', () => {
    render(
      <FloatOptional
        value={-20}
        min={undefined}
        max={undefined}
        exclusiveMin={undefined}
        exclusiveMax={undefined}
        onChange={vi.fn()}
        disabled={false}
      />
    );

    expect(screen.getByTestId('scan-config-optional-value')).toHaveValue('-20');
    expect(screen.getByTestId('scan-config-optional-clear')).toBeInTheDocument();
  });
});
