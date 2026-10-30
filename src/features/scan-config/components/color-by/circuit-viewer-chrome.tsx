import {
  RiAlertLine,
  RiArrowDownSLine,
  RiFocus3Line,
  RiResetLeftLine,
  RiTableLine,
} from '@remixicon/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { PopulationsMenu } from '@/features/circuit-nodes/components/populations-menu';
import { PILL_CLASS, ROUND_PILL_CLASS } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import { ElectrodeInteractionHelp } from '../circuit-viz/electrode-interaction-help';
import { MorphologyLocationHelp } from '../circuit-viz/morphology-location/help';
import { ZoomSlider } from '../zoom-slider/zoom-slider';
import { ChromeButton, FullscreenButton } from './chrome-button';
import { ColorByDropdown } from './color-by-dropdown';
import { ColorLegend } from './color-legend';
import { panelStyle } from './contrast';
import { type IViewerModeOption, ModeToggle } from './mode-toggle';
import { ViewerControlsMenu } from './viewer-controls-menu';

import type { ViewerTheme } from './contrast';
import type { ColorByControls, PopulationsControls } from './use-circuit-color-by';
import type { ViewerControlsMenuProps } from './viewer-controls-menu';

import styles from './chrome-animations.module.css';

// `left-3 top-3` and `gap-2` in px.
const LEFT_TOP = 12;
const GAP = 8;
const LEFT_HEIGHT = 32 + GAP + 32;

export interface ICircuitViewerChromeProps {
  /** The view-mode pill. Omit when the host has only one view to offer. */
  modeToggle?: readonly IViewerModeOption[];
  /**
   * Whether the 3D controls apply right now. `false` hides them while keeping
   * them mounted, so switching to another view and back does not remount them.
   */
  vizActive: boolean;
  /** background-derived theme (adaptive mode), or null for the fixed default */
  theme?: ViewerTheme | null;
  /** nodes-table toggle (always visible in the top-left cluster) */
  table?: { active: boolean; onToggle: () => void };
  /**
   * Fullscreen toggle, beside the table one and visible in every view. Omit to
   * leave it out; the host may not have the element to blow up on first render.
   */
  fullscreen?: { target: HTMLElement | null };
  /**
   * 3D chrome (settings + color-by). Kept mounted across mode switches; hidden
   * in image mode so controls do not remount.
   */
  viz?: {
    menu: ViewerControlsMenuProps;
    onResetView: () => void;
    /** Omit to hide the color-by dropdown + legend. */
    colorBy?: ColorByControls;
    /** Omit to hide the populations checklist. */
    populations?: PopulationsControls;
    /**
     * Whether electrodes can actually be dragged/rotated. Read-only hosts pass
     * false so the interaction help does not advertise gestures that do nothing.
     */
    electrodesInteractive?: boolean;
    /** Whether clicking a neurite adds a morphology location right now. */
    morphologyLocationsInteractive?: boolean;
    /** Camera zoom and a way to set it; omit to leave the zoom slider out. */
    zoom?: { value: number; onChange: (zoom: number) => void };
  };
  /**
   * Where the color-by dropdown goes instead of the top-right corner, such as
   * the end of the host's header row; its key stays in the corner. Null while
   * that element mounts, when the dropdown waits rather than flash in the corner.
   */
  colorByTarget?: HTMLElement | null;
  /** What colouring by no property is called; see `ColorByDropdown`'s `noneLabel`. */
  colorByNoneLabel?: string;
  /**
   * How many cells of the population on show are selected, of how many, and
   * the way back to them all: said at the bottom centre while some are, clear of
   * the Populations pill. With a cell `held`, the way back lets that one go first.
   */
  selection?: { count: number; total: number; onReset: () => void; held?: boolean };
}

/**
 * absolutely-positioned control layer over a circuit viewer: mode toggle +
 * table + fullscreen + settings + populations checklist (top-left), color-by
 * dropdown + key (top-right), and what the checklist can leave the scene in
 * (centre and top-centre). Sits above the 3D canvas
 */
export function CircuitViewerChrome({
  modeToggle,
  vizActive,
  theme,
  table,
  fullscreen,
  viz,
  colorByTarget,
  colorByNoneLabel,
  selection,
}: ICircuitViewerChromeProps) {
  const colorBy = viz?.colorBy;
  const populations = viz?.populations;
  const selectedProperty = colorBy?.selectedProperty ?? null;
  const showKey =
    selectedProperty &&
    !colorBy?.legendLoading &&
    colorBy?.mapping &&
    colorBy.mapping.mode !== 'none';
  const showLegendToggle = !!selectedProperty;
  // Two states the checklist can leave the scene in, worked out here rather
  // than in the viewers: the chrome is the one layer over both of them, and it
  // already holds the way back.
  const hiddenNames = new Set(populations?.hidden);
  // A population with no positions is never drawn, so it is neither hidden nor
  // shown, and counts for neither state.
  const positionless = populations?.positionless;
  const drawable = populations?.populations.filter((p) => !positionless?.has(p.name)) ?? [];
  // Nothing drawn at all. Asked of a non-empty list, so a circuit declaring no
  // populations does not read as a scene the user emptied.
  const allHidden = drawable.length > 0 && drawable.every((p) => hiddenNames.has(p.name));
  // The population being coloured and listed in the nodes table is not among
  // what is drawn. Not worth saying when nothing is: the empty state says it of
  // every population at once.
  const selected = populations?.selected;
  const unplaceableSubject =
    selected !== undefined && positionless?.has(selected) ? selected : undefined;
  const hiddenSubject =
    selected !== undefined &&
    unplaceableSubject === undefined &&
    hiddenNames.has(selected) &&
    !allHidden
      ? selected
      : undefined;
  // Keep viz chrome mounted across view switches; only hide it.
  const showVizChrome = viz != null && vizActive;
  const [legendOpen, setLegendOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarWidth, setToolbarWidth] = useState<number>();
  const leftRef = useRef<HTMLDivElement>(null);
  const [leftBottom, setLeftBottom] = useState(LEFT_TOP + LEFT_HEIGHT);

  useEffect(() => {
    setLegendOpen(!!selectedProperty);
  }, [selectedProperty]);

  const syncToolbarWidth = useCallback(() => {
    const width = toolbarRef.current?.getBoundingClientRect().width;
    if (width) setToolbarWidth(width);
  }, []);

  // Again when the toolbar moves into a host's slot, which remounts it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: colorByTarget is that move
  useLayoutEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;

    syncToolbarWidth();
    const observer = new ResizeObserver(syncToolbarWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncToolbarWidth, colorByTarget]);

  useLayoutEffect(() => {
    const el = leftRef.current;
    if (!el) return;

    const sync = () => setLeftBottom(LEFT_TOP + el.getBoundingClientRect().height);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const belowLeft = leftBottom + GAP;

  const panel = theme ? panelStyle(theme) : undefined;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {viz?.zoom && (
        // Centred below the left column: centred in the canvas, the 200px ruler
        // overlapped it on short viewers.
        <div
          className="pointer-events-none absolute bottom-0 left-1 flex items-center"
          style={{ top: belowLeft }}
        >
          <div
            className={cn(
              'pointer-events-auto',
              // Frosted so a morphology drawn behind the ruler cannot swallow its ticks.
              // No ring or shadow, unlike the chrome's other panels: this one sits over the
              // canvas rather than beside it, and an edge would draw the eye to the panel.
              'rounded-xl px-1 py-1.5 backdrop-blur-md',
              !theme && 'bg-white/70',
              !showVizChrome && 'invisible pointer-events-none'
            )}
            style={
              theme ? { background: theme.panelBackground, color: theme.foreground } : undefined
            }
            aria-hidden={!showVizChrome}
            inert={!showVizChrome || undefined}
          >
            <ZoomSlider zoom={viz.zoom.value} onZoomChange={viz.zoom.onChange} theme={theme} />
          </div>
        </div>
      )}
      {/* What the scene is made of: which populations are in it, the table
          listing the one on show, and how it is drawn. */}
      <div
        ref={leftRef}
        data-testid="viewer-chrome-left"
        className="pointer-events-auto absolute left-3 top-3 flex flex-col items-start gap-2"
      >
        <div className="flex items-center gap-2">
          {modeToggle && <ModeToggle options={modeToggle} />}
          {table && (
            <ChromeButton
              label={table.active ? 'Hide nodes table' : 'Show nodes table'}
              onClick={table.onToggle}
              active={table.active}
            >
              <RiTableLine className="size-4" />
            </ChromeButton>
          )}
          {fullscreen && <FullscreenButton target={fullscreen.target} />}
          {viz && (
            <div
              className={cn(
                'flex items-center gap-2',
                !showVizChrome && 'invisible pointer-events-none'
              )}
              aria-hidden={!showVizChrome}
              inert={!showVizChrome || undefined}
            >
              <ViewerControlsMenu {...viz.menu} />
              {/* Ahead of the help icons, which come and go with the mode: in a
                  row anchored to the left edge, only what precedes an element can
                  move it, and the pill's own width changes as populations are
                  ticked off. */}
              {populations && (
                <PopulationsMenu
                  populations={populations.populations}
                  hidden={populations.hidden}
                  onChange={populations.onChange}
                  selected={populations.selected}
                  onSelect={populations.onSelect}
                  positionless={populations.positionless}
                  theme={theme}
                  autoOpen={showVizChrome}
                />
              )}
              {viz.menu.onToggleElectrodes &&
                viz.menu.showElectrodes !== false &&
                viz.electrodesInteractive !== false && <ElectrodeInteractionHelp />}
              {viz.morphologyLocationsInteractive && <MorphologyLocationHelp />}
            </div>
          )}
        </div>
        {viz && (
          <div
            className={cn(!showVizChrome && 'invisible pointer-events-none')}
            aria-hidden={!showVizChrome}
            inert={!showVizChrome || undefined}
          >
            <ChromeButton
              label="Re-centre view"
              testId="viewer-reset-view"
              onClick={viz.onResetView}
            >
              <RiFocus3Line className="size-4" />
            </ChromeButton>
          </div>
        )}
      </div>
      {showVizChrome && selection && (
        <div className="pointer-events-auto absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
          <span
            className={cn(
              PILL_CLASS,
              'font-normal whitespace-nowrap text-neutral-500 hover:bg-white'
            )}
          >
            <strong className="text-primary-9 font-semibold">
              {selection.count.toLocaleString()}
            </strong>
            of {selection.total.toLocaleString()} {selection.total === 1 ? 'neuron' : 'neurons'}{' '}
            selected
          </span>
          <button
            type="button"
            onClick={selection.onReset}
            title={selection.held ? 'Let the neuron go' : 'Show every neuron again'}
            aria-label={selection.held ? 'Let the neuron go' : 'Show every neuron again'}
            className={ROUND_PILL_CLASS}
          >
            <RiResetLeftLine className="size-4" />
          </button>
        </div>
      )}
      {/* Below the left column: in its row it overlapped the Populations pill on narrow screens. */}
      {showVizChrome && populations && hiddenSubject !== undefined && (
        <div
          className="pointer-events-auto absolute left-1/2 -translate-x-1/2"
          style={{ top: belowLeft }}
        >
          <ChromeNotice
            action="Show"
            onAction={() =>
              populations.onChange(populations.hidden.filter((name) => name !== hiddenSubject))
            }
            theme={theme}
            warning
            style={panel}
            className="px-3 py-1.5 text-xs"
          >
            “{hiddenSubject}” is selected but hidden
          </ChromeNotice>
        </div>
      )}
      {showVizChrome && unplaceableSubject !== undefined && (
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: belowLeft }}>
          <ChromeNotice theme={theme} warning style={panel} className="px-3 py-1.5 text-xs">
            “{unplaceableSubject}” has no positions (x/y/z), so it can’t be drawn in 3D
          </ChromeNotice>
        </div>
      )}

      {colorBy && (
        <div
          className={cn(
            'pointer-events-auto absolute right-3 top-3 flex flex-col items-end gap-2',
            !showVizChrome && 'invisible pointer-events-none'
          )}
          aria-hidden={!showVizChrome}
          inert={!showVizChrome || undefined}
          style={
            toolbarWidth != null
              ? ({ '--color-by-toolbar-width': `${toolbarWidth}px` } as React.CSSProperties)
              : undefined
          }
        >
          {/* Measured here rather than on the column, which holds the key that
              is being sized from it. Raised into a host's slot it leaves the key
              behind in this corner, so it carries its own hidden state there. */}
          <Placed target={colorByTarget}>
            <div
              ref={toolbarRef}
              data-testid="color-by-toolbar"
              className={cn(
                'flex items-center gap-1',
                colorByTarget !== undefined &&
                  (showVizChrome ? 'pointer-events-auto' : 'invisible pointer-events-none')
              )}
              aria-hidden={colorByTarget !== undefined && !showVizChrome}
              inert={(colorByTarget !== undefined && !showVizChrome) || undefined}
            >
              <ColorByDropdown
                value={colorBy.selectedProperty}
                onChange={colorBy.onSelectProperty}
                properties={colorBy.properties}
                loading={colorBy.propertiesLoading}
                error={colorBy.propertiesError}
                onRetry={colorBy.onRetryProperties}
                noneLabel={colorByNoneLabel}
              />
              {showLegendToggle && (
                // A round pill as tall as the dropdown's, in its look.
                <button
                  type="button"
                  id="color-mapping-panel-toggle"
                  data-slot="color-mapping-panel-toggle"
                  aria-label={legendOpen ? 'Hide color mapping' : 'Show color mapping'}
                  aria-expanded={legendOpen}
                  aria-controls="color-mapping-panel"
                  onClick={() => setLegendOpen((open) => !open)}
                  className={cn(ROUND_PILL_CLASS, styles.legendToggle, 'ml-1')}
                >
                  <RiArrowDownSLine
                    className={cn(
                      styles.chevronIcon,
                      'size-4',
                      legendOpen && styles.chevronIconOpen
                    )}
                  />
                </button>
              )}
            </div>
          </Placed>
          {showKey && legendOpen && colorBy.mapping && (
            <div
              className={cn(styles.panelReveal, 'min-w-0')}
              style={{ width: 'var(--color-by-toolbar-width)' }}
            >
              <ColorLegend
                mapping={colorBy.mapping}
                onChangeCategoryColor={colorBy.onChangeCategoryColor}
                theme={theme}
              />
            </div>
          )}
        </div>
      )}

      {showVizChrome && allHidden && populations && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ChromeNotice
            action="Show all"
            onAction={() => populations.onChange([])}
            theme={theme}
            style={panel}
            className="pointer-events-auto px-4 py-2 text-sm"
          >
            Every population is hidden
          </ChromeNotice>
        </div>
      )}
    </div>
  );
}

/**
 * A line of status over the canvas, with the way out of it. Wears the chrome's
 * own pill because it sits among the controls and over the same 3D scene: bare
 * text would be read against whatever colour happens to be behind it.
 */
function ChromeNotice({
  children,
  action,
  onAction,
  theme,
  warning = false,
  style,
  className,
}: {
  children: React.ReactNode;
  theme?: ViewerTheme | null;
  warning?: boolean;
  style?: React.CSSProperties;
  className?: string;
} & (
  | {
      /** Label of the button that undoes what the notice reports. Omit both where nothing can. */
      action: string;
      onAction: () => void;
    }
  | { action?: never; onAction?: never }
)) {
  // Themed panels ring with a box-shadow in `style`, the fixed light one with a Tailwind ring.
  const ringStyle = warning && theme ? { boxShadow: '0 0 0 1px var(--color-warning)' } : undefined;
  return (
    <div
      role="status"
      style={{ ...style, ...ringStyle }}
      className={cn(
        'flex items-center gap-2 rounded-full backdrop-blur-sm',
        !theme && 'bg-white text-neutral-600 shadow-md ring-1',
        !theme && (warning ? 'ring-warning' : 'ring-black/5'),
        className
      )}
    >
      {warning && <RiAlertLine aria-hidden className="size-4 shrink-0 text-warning" />}
      <span>{children}</span>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className={cn('font-semibold hover:underline', !theme && 'text-primary-9')}
        >
          {action}
        </button>
      )}
    </div>
  );
}

/** In place without a target, in the target once it is there, and nowhere until then. */
function Placed({
  target,
  children,
}: {
  target: HTMLElement | null | undefined;
  children: React.ReactNode;
}) {
  if (target === undefined) return children;
  return target ? createPortal(children, target) : null;
}
