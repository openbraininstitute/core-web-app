import { RiAlertLine, RiArrowDownSLine, RiFocus3Line, RiTableLine } from '@remixicon/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { PopulationsMenu } from '@/features/circuit-nodes/components/populations-menu';
import { cn } from '@/utils/css-class';

import { ElectrodeInteractionHelp } from '../circuit-viz/electrode-interaction-help';
import { MorphologyLocationHelp } from '../circuit-viz/morphology-location/help';
import { ZoomSlider } from '../zoom-slider/zoom-slider';
import { ChromeButton, FullscreenButton } from './chrome-button';
import { ColorByDropdown } from './color-by-dropdown';
import { ColorLegend } from './color-legend';
import { type IViewerModeOption, ModeToggle } from './mode-toggle';
import { ViewerControlsMenu } from './viewer-controls-menu';

import type { ViewerTheme } from './contrast';
import type { ColorByControls, PopulationsControls } from './use-circuit-color-by';
import type { ViewerControlsMenuProps } from './viewer-controls-menu';

import styles from './chrome-animations.module.css';

/** `left-3 top-3` and `gap-2` as numbers, for what is placed from the column's height. */
const LEFT_TOP = 12;
const GAP = 8;
/** Its two rows of round buttons, until the observer has measured the real thing. */
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
    /** Frame the population on show again. Its own button, below the controls row. */
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
  // Nothing drawn at all. Asked of a non-empty list, so a circuit declaring no
  // populations does not read as a scene the user emptied.
  const allHidden =
    !!populations?.populations.length &&
    populations.populations.every((p) => hiddenNames.has(p.name));
  // The population being coloured and listed in the nodes table is not among
  // what is drawn. Not worth saying when nothing is: the empty state says it of
  // every population at once.
  const hiddenSubject =
    populations?.selected !== undefined && hiddenNames.has(populations.selected) && !allHidden
      ? populations.selected
      : undefined;
  // Keep viz chrome mounted across view switches; only hide it.
  const showVizChrome = viz != null && vizActive;
  const [legendOpen, setLegendOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarWidth, setToolbarWidth] = useState<number>();
  const leftRef = useRef<HTMLDivElement>(null);
  // Where the left column ends, so what sits under it can start there. It is
  // two rows deep now and grows with the pill's own width, so a fixed offset
  // would be wrong on the first narrow screen.
  const [leftBottom, setLeftBottom] = useState(LEFT_TOP + LEFT_HEIGHT);

  useEffect(() => {
    setLegendOpen(!!selectedProperty);
  }, [selectedProperty]);

  const syncToolbarWidth = useCallback(() => {
    const width = toolbarRef.current?.getBoundingClientRect().width;
    if (width) setToolbarWidth(width);
  }, []);

  useLayoutEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;

    syncToolbarWidth();
    const observer = new ResizeObserver(syncToolbarWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncToolbarWidth]);

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

  const panelStyle = theme
    ? {
        background: theme.panelBackground,
        color: theme.foreground,
        boxShadow: `0 0 0 1px ${theme.panelRing}`,
      }
    : undefined;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {viz?.zoom && (
        // Centred in what the left column leaves rather than in the canvas: the
        // ruler is 200px tall and shares this edge, so on a short viewer the
        // two were in the same place.
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
        {/* Under the row rather than in it: it acts on the scene, where the row
            above decides what the scene is made of. */}
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
      {/* Below the controls, whose height is measured: centred among them it
          overlapped the Populations pill on narrow screens. */}
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
            style={panelStyle}
            className="px-3 py-1.5 text-xs"
          >
            “{hiddenSubject}” is selected but hidden
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
              is being sized from it. */}
          <div ref={toolbarRef} data-testid="color-by-toolbar" className="flex items-center gap-1">
            <ColorByDropdown
              value={colorBy.selectedProperty}
              onChange={colorBy.onSelectProperty}
              properties={colorBy.properties}
              loading={colorBy.propertiesLoading}
              error={colorBy.propertiesError}
              onRetry={colorBy.onRetryProperties}
              theme={theme}
            />
            {showLegendToggle && (
              <button
                type="button"
                id="color-mapping-panel-toggle"
                data-slot="color-mapping-panel-toggle"
                aria-label={legendOpen ? 'Hide color mapping' : 'Show color mapping'}
                aria-expanded={legendOpen}
                aria-controls="color-mapping-panel"
                onClick={() => setLegendOpen((open) => !open)}
                style={panelStyle}
                className={cn(
                  styles.legendToggle,
                  'inline-flex size-8 ml-1 shrink-0 items-center justify-center rounded-full backdrop-blur-sm transition-colors focus-visible:outline-none',
                  theme
                    ? 'hover:brightness-110'
                    : 'bg-white text-primary-9 shadow-md ring-1 ring-black/5 hover:bg-neutral-50'
                )}
              >
                <RiArrowDownSLine
                  className={cn(styles.chevronIcon, 'size-4', legendOpen && styles.chevronIconOpen)}
                />
              </button>
            )}
          </div>
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
            style={panelStyle}
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
  /** Label of the button that undoes what the notice reports. */
  action: string;
  onAction: () => void;
  theme?: ViewerTheme | null;
  warning?: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
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
      <button
        type="button"
        onClick={onAction}
        className={cn('font-semibold hover:underline', !theme && 'text-primary-9')}
      >
        {action}
      </button>
    </div>
  );
}
