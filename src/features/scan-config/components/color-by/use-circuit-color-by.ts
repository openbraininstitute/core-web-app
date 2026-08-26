import { useCallback, useMemo, useRef } from 'react';

import { downloadCircuitImage } from '@/features/scan-config/components/shared/3d-viewer';
import { useMorphoViewerSignals } from '@/morpho-viewer';

import {
  BACKGROUND_ADAPTIVE,
  backgroundIsDark,
  CANVAS_DARK,
  CANVAS_LIGHT,
  viewerTheme,
} from './contrast';
import { defaultNeuronColor, recededNeuronColor } from './palette';
import { buildColorByProperties } from './properties';
import { useNodeColorMapping } from './use-node-color-mapping';
import { useViewerConfig } from './use-viewer-config';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { ViewerTheme } from './contrast';
import type { ColorByProperty, ColorMapping } from './types';
import type { ViewerControlsMenuProps } from './viewer-controls-menu';

interface Options {
  /** whether this viewer exposes an axons toggle (morphology viewer only) */
  supportsAxons?: boolean;
  /** whether electrode overlays are available for this preview */
  supportsElectrodes?: boolean;
  /** whether morphology-location markers are on screen, which the marker controls act on */
  supportsMorphologyLocations?: boolean;
  /**
   * Initial neuron opacity (0–1). Host-owned — e.g. pass
   * {@link ELECTRODE_FOCUSED_NEURON_OPACITY} when placing electrodes.
   * Defaults to full opacity when omitted.
   */
  defaultNeuronOpacity?: number;
  /** SONATA population whose H5 columns drive colour-by and the nodes table */
  population?: NodePopulation;
  /** What is on show when it is not a circuit. Names the saved config and the snapshot. */
  subject?: Pick<EntityCoreIdentifiableNamed, 'id' | 'name'>;
}

/** props the chrome needs to render the color-by dropdown + key */
export interface ColorByControls {
  selectedProperty: string | null;
  onSelectProperty: (property: string | null) => void;
  /** property options, read from the circuit's SONATA H5 columns (from source) */
  properties: ColorByProperty[];
  /** true while the H5 is still being opened (property list not yet available) */
  propertiesLoading: boolean;
  mapping: ColorMapping | null;
  /** while true (property changing / loading) the key is temporarily hidden */
  legendLoading: boolean;
  /** true when the property list failed to load (worker/download error) */
  propertiesError: boolean;
  /** retry loading the property list after an error */
  onRetryProperties: () => void;
  /** override the color of a single categorical value */
  onChangeCategoryColor: (value: string, color: string) => void;
}

/**
 * central state for the color-by feature on a single circuit viewer: the
 * persisted config, the per-node color mapping (with user overrides), and
 * ready-made control props for the chrome. `colorsByNode` is aligned by node
 * index for the viewer. owned by the preview host, which passes `colorsByNode`
 * and the config down to the actual viewers. Also serves the MEModel viewer, which
 * has no colour-by.
 */
export function useCircuitColorBy(
  circuit: ICircuit | undefined,
  {
    supportsAxons,
    supportsElectrodes,
    supportsMorphologyLocations,
    defaultNeuronOpacity,
    population,
    subject,
  }: Options = {}
) {
  const shown = subject ?? circuit;
  const { config, hasSavedConfig, update, reset } = useViewerConfig(shown?.id ?? '', {
    defaultNeuronOpacity,
  });
  const populationName = population?.name;
  const property =
    populationName === undefined ? null : (config.colorByProperty[populationName] ?? null);
  const overridesForProperty = property ? config.colorOverrides[property] : undefined;
  const backgroundDark = backgroundIsDark(config.backgroundColor);
  const adaptiveBackground = BACKGROUND_ADAPTIVE
    ? backgroundDark
      ? CANVAS_DARK
      : CANVAS_LIGHT
    : undefined;

  const { mapping, loading, columns, status, retry } = useNodeColorMapping(
    circuit,
    population,
    property,
    overridesForProperty,
    adaptiveBackground
  );
  const properties = useMemo(() => buildColorByProperties(columns), [columns]);
  const theme = useMemo<ViewerTheme | null>(
    () => (BACKGROUND_ADAPTIVE ? viewerTheme(backgroundDark) : null),
    [backgroundDark]
  );
  const defaultColor = useMemo(() => defaultNeuronColor(adaptiveBackground), [adaptiveBackground]);
  const recededColor = useMemo(
    () => recededNeuronColor(config.backgroundColor),
    [config.backgroundColor]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  // one signal bus per viewer instance: dispatch to trigger camera reset /
  // snapshot, and let the viewer components listen for the captured image.
  const signals = useMorphoViewerSignals();
  const captureImage = useCallback(async () => {
    const image = await signals.snapshot.dispatch(undefined).catch(() => null);
    if (image) downloadCircuitImage(image, shown?.name ?? '', config.backgroundColor);
  }, [signals, shown?.name, config.backgroundColor]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  }, []);

  const onChangeCategoryColor = useCallback(
    (value: string, color: string) => {
      if (!property) return;
      update({
        colorOverrides: {
          ...config.colorOverrides,
          [property]: { ...config.colorOverrides[property], [value]: color },
        },
      });
    },
    [property, config.colorOverrides, update]
  );

  const colorBy: ColorByControls = useMemo(
    () => ({
      selectedProperty: property,
      onSelectProperty: (p) => {
        if (populationName === undefined) return;
        update({ colorByProperty: { ...config.colorByProperty, [populationName]: p } });
      },
      properties,
      propertiesLoading: !columns && status !== 'error',
      mapping,
      legendLoading: loading,
      propertiesError: status === 'error',
      onRetryProperties: retry,
      onChangeCategoryColor,
    }),
    [
      property,
      populationName,
      config.colorByProperty,
      properties,
      columns,
      status,
      retry,
      mapping,
      loading,
      update,
      onChangeCategoryColor,
    ]
  );

  const menu: ViewerControlsMenuProps = useMemo(
    () => ({
      onFullscreen: toggleFullscreen,
      onResetView: () => signals.cameraReset.dispatch(),
      onCaptureImage: captureImage,
      backgroundDark,
      onBackgroundDarkChange: (dark) =>
        update({ backgroundColor: dark ? CANVAS_DARK : CANVAS_LIGHT }),
      showAxons: supportsAxons ? config.showAxons : undefined,
      onToggleAxons: supportsAxons ? (value) => update({ showAxons: value }) : undefined,
      neuronOpacity: config.neuronOpacity,
      onNeuronOpacityChange: (value) => update({ neuronOpacity: value }),
      showElectrodes: supportsElectrodes ? config.showElectrodes : undefined,
      onToggleElectrodes: supportsElectrodes
        ? (value) => update({ showElectrodes: value })
        : undefined,
      electrodeRadius: supportsElectrodes ? config.electrodeRadius : undefined,
      onElectrodeRadiusChange: supportsElectrodes
        ? (value) => update({ electrodeRadius: value })
        : undefined,
      // Only offered while locations can actually be picked, so the menu does not carry a
      // control for something not on screen.
      morphologyLocationRadius: supportsMorphologyLocations
        ? config.morphologyLocationRadius
        : undefined,
      onMorphologyLocationRadiusChange: supportsMorphologyLocations
        ? (value: number) => update({ morphologyLocationRadius: value })
        : undefined,
      showMorphologyLocationLabels: supportsMorphologyLocations
        ? config.showMorphologyLocationLabels
        : undefined,
      onToggleMorphologyLocationLabels: supportsMorphologyLocations
        ? (value: boolean) => update({ showMorphologyLocationLabels: value })
        : undefined,
      // Offered only where a zoom slider can actually appear — the large-circuit viewer
      // has none, and a switch that does nothing is worse than no switch.
      showZoomSlider: supportsAxons ? config.showZoomSlider : undefined,
      onToggleZoomSlider: supportsAxons
        ? (value: boolean) => update({ showZoomSlider: value })
        : undefined,
      showScalebar: config.showScalebar,
      onToggleScalebar: (value: boolean) => update({ showScalebar: value }),
      hasSavedConfig,
      onResetConfig: reset,
    }),
    [
      signals,
      toggleFullscreen,
      captureImage,
      backgroundDark,
      config.showAxons,
      config.neuronOpacity,
      config.showElectrodes,
      config.electrodeRadius,
      config.morphologyLocationRadius,
      config.showMorphologyLocationLabels,
      config.showZoomSlider,
      config.showScalebar,
      supportsAxons,
      supportsElectrodes,
      supportsMorphologyLocations,
      hasSavedConfig,
      update,
      reset,
    ]
  );

  return {
    containerRef,
    config,
    colorsByNode: mapping?.colorsByNode,
    /** default neuron color (adapted to the background in adaptive mode) */
    defaultColor,
    /** paint for the somas of the populations drawn but not on show */
    recededColor,
    /** chrome theme derived from the background, or null when adaptive mode is off */
    theme,
    /** signal bus passed to the viewer to trigger camera reset / snapshot */
    signals,
    colorBy,
    menu,
  };
}
