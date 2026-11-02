import { useCallback, useMemo, useRef } from 'react';

import { useCircuitViewerSignals } from '@/features/circuit-viewer/signals';
import { downloadCircuitImage } from '@/features/scan-config/components/shared/3d-viewer';

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
import type { CircuitRepresentation, ColorByProperty, ColorMapping } from './types';
import type { ViewerControlsMenuProps } from './viewer-controls-menu';

interface Options {
  /** whether electrode overlays are available for this preview */
  supportsElectrodes?: boolean;
  /** whether morphology-location markers are on screen, which the marker controls act on */
  supportsMorphologyLocations?: boolean;
  /** whether the viewer draws cells as soma points, which the soma size and opacity controls act on */
  drawsSomas?: boolean;
  /** whether the circuit's cells can be drawn as morphologies in place of the soma points */
  supportsMorphologies?: boolean;
  /** where they cannot be, but are coming or never will, why: the switch is shown off with it */
  morphologiesNote?: string;
  /** what the cells are drawn as to begin with, where morphologies are offered; somas when omitted */
  defaultRepresentation?: CircuitRepresentation;
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

/** props the chrome needs to render the populations checklist */
export interface PopulationsControls {
  /** Every population the circuit declares, in declared order. */
  populations: readonly NodePopulation[];
  /** The ones taken out of the scene, by name; the rest are drawn. */
  hidden: readonly string[];
  /**
   * Replace the hidden set. One setter rather than a callback per gesture:
   * showing all of them and showing only one are both a set, worked out where
   * the list is on hand.
   */
  onChange: (hidden: string[]) => void;
  /** The population on show, drawn in full and listed in the nodes table. */
  selected?: string;
  /** Put another population on show. Absent where the host pins that choice. */
  onSelect?: (name: string) => void;
  /** The ones whose nodes carry no x/y/z, by name: listed, never drawn. */
  positionless?: ReadonlySet<string>;
}

/**
 * central state for the color-by feature on a single circuit viewer: the
 * persisted config, the per-node color mapping (with user overrides), and
 * ready-made control props for the chrome. `nodeColors` is the mapping's
 * palette plus a palette column per node, aligned by node index for the
 * viewer. owned by the preview host, which passes `nodeColors` and the config
 * down to the actual viewers. Also serves the MEModel viewer, which
 * has no colour-by.
 */
export function useCircuitColorBy(
  circuit: ICircuit | undefined,
  {
    supportsElectrodes,
    supportsMorphologyLocations,
    drawsSomas,
    supportsMorphologies,
    morphologiesNote,
    defaultRepresentation,
    defaultNeuronOpacity,
    population,
    subject,
  }: Options = {}
) {
  const shown = subject ?? circuit;
  const { config, hasSavedConfig, update, reset } = useViewerConfig(shown?.id ?? '', {
    defaultNeuronOpacity,
    defaultRepresentation,
  });
  // The choice is kept where morphologies stop being offered, and comes back with them.
  const representation: CircuitRepresentation = supportsMorphologies
    ? config.representation
    : 'somas';
  const morphologies = representation === 'morphologies';
  // The morphologies are drawn opaque, at their own size.
  const somas = !!drawsSomas && !morphologies;
  // Wherever morphologies are drawn, their axons can be hidden.
  const axons = !somas;
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
  const signals = useCircuitViewerSignals();
  const captureImage = useCallback(async () => {
    const frame = await signals.snapshot.dispatch().catch(() => null);
    if (frame) downloadCircuitImage(frame, shown?.name ?? '', config.backgroundColor);
  }, [signals, shown?.name, config.backgroundColor]);

  // Merged inside the update rather than from the rendered config, so two
  // swatches changed in one tick do not both start from the same overrides.
  const onChangeCategoryColor = useCallback(
    (value: string, color: string) => {
      if (!property) return;
      update((previous) => ({
        colorOverrides: {
          ...previous.colorOverrides,
          [property]: { ...previous.colorOverrides[property], [value]: color },
        },
      }));
    },
    [property, update]
  );

  const onHiddenPopulationsChange = useCallback(
    (hiddenPopulations: string[]) => update({ hiddenPopulations }),
    [update]
  );

  const onRepresentationChange = useCallback(
    (next: CircuitRepresentation) => update({ representation: next }),
    [update]
  );

  const colorBy: ColorByControls = useMemo(
    () => ({
      selectedProperty: property,
      // @see onChangeCategoryColor: the same merge, one entry per population.
      onSelectProperty: (p) => {
        if (populationName === undefined) return;
        update((previous) => ({
          colorByProperty: { ...previous.colorByProperty, [populationName]: p },
        }));
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

  const onResetView = useCallback(() => {
    signals.cameraReset.dispatch(undefined).catch(() => {});
  }, [signals]);

  const menu: ViewerControlsMenuProps = useMemo(
    () => ({
      onCaptureImage: captureImage,
      backgroundDark,
      onBackgroundDarkChange: (dark) =>
        update({ backgroundColor: dark ? CANVAS_DARK : CANVAS_LIGHT }),
      showAxons: axons ? config.showAxons : undefined,
      onToggleAxons: axons ? (value) => update({ showAxons: value }) : undefined,
      showMorphologies: supportsMorphologies ? morphologies : undefined,
      onToggleMorphologies: supportsMorphologies
        ? (value) => onRepresentationChange(value ? 'morphologies' : 'somas')
        : undefined,
      morphologiesNote: supportsMorphologies ? undefined : morphologiesNote,
      neuronOpacity: somas ? config.neuronOpacity : undefined,
      onNeuronOpacityChange: somas ? (value) => update({ neuronOpacity: value }) : undefined,
      somaSizeScale: somas ? config.somaSizeScale : undefined,
      onSomaSizeScaleChange: somas
        ? (value: number) => update({ somaSizeScale: value })
        : undefined,
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
      showZoomSlider: config.showZoomSlider,
      onToggleZoomSlider: (value: boolean) => update({ showZoomSlider: value }),
      showScalebar: config.showScalebar,
      onToggleScalebar: (value: boolean) => update({ showScalebar: value }),
      spin: config.spin,
      onToggleSpin: (value: boolean) => update({ spin: value }),
      hasSavedConfig,
      onResetConfig: reset,
    }),
    [
      captureImage,
      backgroundDark,
      config.showAxons,
      config.neuronOpacity,
      config.somaSizeScale,
      config.showElectrodes,
      config.electrodeRadius,
      config.morphologyLocationRadius,
      config.showMorphologyLocationLabels,
      config.showZoomSlider,
      config.showScalebar,
      config.spin,
      axons,
      supportsElectrodes,
      supportsMorphologyLocations,
      supportsMorphologies,
      morphologiesNote,
      morphologies,
      somas,
      onRepresentationChange,
      hasSavedConfig,
      update,
      reset,
    ]
  );

  return {
    containerRef,
    config,
    /** the mapping's palette + palette column per node, for the viewers */
    nodeColors: mapping ?? undefined,
    /** default neuron color (adapted to the background in adaptive mode) */
    defaultColor,
    /** colour for the somas of the populations drawn but not on show */
    recededColor,
    /** chrome theme derived from the background, or null when adaptive mode is off */
    theme,
    /** signal bus passed to the viewer to trigger camera reset / snapshot */
    signals,
    onResetView,
    colorBy,
    /** Take populations out of the scene, or put them back; see {@link PopulationsControls}. */
    onHiddenPopulationsChange,
    /** what the cells are drawn as; see {@link ViewerConfig.representation} */
    representation,
    /** absent where morphologies are not offered */
    onRepresentationChange: supportsMorphologies ? onRepresentationChange : undefined,
    menu,
  };
}
