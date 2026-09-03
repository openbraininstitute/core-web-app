import {
  RiAlertLine,
  RiArrowDownSLine,
  RiFullscreenExitLine,
  RiFullscreenLine,
  RiTableLine,
} from '@remixicon/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { PopulationsMenu } from '@/features/circuit-nodes/components/populations-menu';
import { cn } from '@/utils/css-class';

import { ElectrodeInteractionHelp } from '../circuit-viz/electrode-interaction-help';
import { MorphologyLocationHelp } from '../circuit-viz/morphology-location/help';
import { ZoomSlider } from '../zoom-slider/zoom-slider';
import { ChromeButton } from './chrome-button';
import { ColorByDropdown } from './color-by-dropdown';
import { ColorLegend } from './color-legend';
import { useFullscreenElement } from './fullscreen';
import { type IViewerModeOption, ModeToggle } from './mode-toggle';
import { ViewerControlsMenu } from './viewer-controls-menu';

import type { ViewerTheme } from './contrast';
import type { ColorByControls, PopulationsControls } from './use-circuit-color-by';
import type { ViewerControlsMenuProps } from './viewer-controls-menu';

import styles from './chrome-animations.module.css';

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
   * Fullscreen toggle, beside the table one and visible in every view. The host
   * supplies it because what goes fullscreen is more than the 3D scene; omit to
   * leave the button out.
   */
  onToggleFullscreen?: () => void;
  /**
   * 3D chrome (settings + color-by). Kept mounted across mode switches; hidden
   * in image mode so controls do not remount.
   */
  viz?: {
    menu: ViewerControlsMenuProps;
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
  onToggleFullscreen,
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
  // Portalled overlays must render inside the fullscreen element to stay visible
  // in fullscreen; null → the browser default (document.body).
  const portalContainer = useFullscreenElement();
  const isFullscreen = portalContainer !== null;

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
        <div
          className={cn(
            'pointer-events-auto absolute left-1 top-1/2 -translate-y-1/2',
            // Frosted so a morphology drawn behind the ruler cannot swallow its ticks.
            // No ring or shadow, unlike the chrome's other panels: this one sits over the
            // canvas rather than beside it, and an edge would draw the eye to the panel.
            'rounded-xl px-1 py-1.5 backdrop-blur-md',
            !theme && 'bg-white/70',
            !showVizChrome && 'invisible pointer-events-none'
          )}
          style={theme ? { background: theme.panelBackground, color: theme.foreground } : undefined}
          aria-hidden={!showVizChrome}
          inert={!showVizChrome || undefined}
        >
          <ZoomSlider zoom={viz.zoom.value} onZoomChange={viz.zoom.onChange} theme={theme} />
        </div>
      )}
      {/* What the scene is made of: which populations are in it, the table
          listing the one on show, and how it is drawn. */}
      <div
        data-testid="viewer-chrome-left"
        className="pointer-events-auto absolute left-3 top-3 flex items-center gap-2"
      >
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
        {onToggleFullscreen && (
          <ChromeButton
            label={isFullscreen ? 'Exit full screen' : 'Full screen'}
            onClick={onToggleFullscreen}
            active={isFullscreen}
          >
            {isFullscreen ? (
              <RiFullscreenExitLine className="size-4" />
            ) : (
              <RiFullscreenLine className="size-4" />
            )}
          </ChromeButton>
        )}
        {viz && (
          <div
            className={cn(
              'flex items-center gap-2',
              !showVizChrome && 'invisible pointer-events-none'
            )}
            aria-hidden={!showVizChrome}
            inert={!showVizChrome || undefined}
          >
            <ViewerControlsMenu {...viz.menu} container={portalContainer} />
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
                container={portalContainer}
                autoOpen={showVizChrome}
              />
            )}
            {viz.menu.onToggleElectrodes &&
              viz.menu.showElectrodes !== false &&
              viz.electrodesInteractive !== false && (
                <ElectrodeInteractionHelp container={portalContainer} />
              )}
            {viz.morphologyLocationsInteractive && (
              <MorphologyLocationHelp container={portalContainer} />
            )}
          </div>
        )}
      </div>
      {/* Below the controls row: centred in that row it overlapped the
          Populations pill on narrow screens. */}
      {showVizChrome && populations && hiddenSubject !== undefined && (
        <div className="pointer-events-auto absolute left-1/2 top-14 -translate-x-1/2">
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
              container={portalContainer}
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
                container={portalContainer}
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
