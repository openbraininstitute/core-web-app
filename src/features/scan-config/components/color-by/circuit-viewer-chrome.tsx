import { RiArrowDownSLine, RiFullscreenExitLine, RiTableLine } from '@remixicon/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import { ElectrodeInteractionHelp } from '../circuit-viz/electrode-interaction-help';
import { MorphologyLocationHelp } from '../circuit-viz/morphology-location-help';
import { ColorByDropdown } from './color-by-dropdown';
import { ColorLegend } from './color-legend';
import { ModeToggle, type ViewerMode, ViewerModeDict } from './mode-toggle';
import { useFullscreenElement } from './use-fullscreen-element';
import { ViewerControlsMenu } from './viewer-controls-menu';

import type { ViewerTheme } from './contrast';
import type { ColorByControls } from './use-circuit-color-by';
import type { ViewerControlsMenuProps } from './viewer-controls-menu';

import styles from './chrome-animations.module.css';

export interface CircuitViewerChromeProps {
  /** Current viewer mode. Omit with `onModeChange` when image mode is unavailable. */
  mode?: ViewerMode;
  onModeChange?: (mode: ViewerMode) => void;
  /** Offer the dendrogram tab alongside 3D and image. */
  showDendrogram?: boolean;
  /** Offer the image tab. */
  showImageMode?: boolean;
  /** background-derived theme (adaptive mode), or null for the fixed default */
  theme?: ViewerTheme | null;
  /** nodes-table toggle (always visible in the top-left cluster) */
  table?: { active: boolean; onToggle: () => void };
  /**
   * 3D chrome (settings + color-by). Kept mounted across mode switches; hidden
   * in image mode so controls do not remount.
   */
  viz?: {
    menu: ViewerControlsMenuProps;
    /** Omit to hide the color-by dropdown + legend. */
    colorBy?: ColorByControls;
    /**
     * Whether electrodes can actually be dragged/rotated. Read-only hosts pass
     * false so the interaction help does not advertise gestures that do nothing.
     */
    electrodesInteractive?: boolean;
  };
}

/**
 * absolutely-positioned control layer over a circuit viewer: mode toggle +
 * table + settings (top-left), color-by dropdown + key (top-right). Sits above
 * the 3D canvas
 */
export function CircuitViewerChrome({
  mode,
  onModeChange,
  showDendrogram,
  showImageMode,
  theme,
  table,
  viz,
}: CircuitViewerChromeProps) {
  const colorBy = viz?.colorBy;
  const selectedProperty = colorBy?.selectedProperty ?? null;
  const showKey =
    selectedProperty &&
    !colorBy?.legendLoading &&
    colorBy?.mapping &&
    colorBy.mapping.mode !== 'none';
  const showLegendToggle = !!selectedProperty;
  // Keep viz chrome mounted across image↔3D switches; only hide it.
  const showVizChrome = viz != null && mode !== ViewerModeDict.Image;
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
      <div className="pointer-events-auto absolute left-3 top-3 flex items-center gap-2">
        {mode != null && onModeChange && (
          <ModeToggle
            mode={mode}
            onChange={onModeChange}
            showDendrogram={showDendrogram}
            showImage={showImageMode}
          />
        )}
        {table && (
          <ChromeButton
            label={table.active ? 'Hide nodes table' : 'Show nodes table'}
            onClick={table.onToggle}
            active={table.active}
          >
            <RiTableLine className="size-4" />
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
            {isFullscreen && (
              <ChromeButton label="Exit full screen" onClick={viz.menu.onFullscreen}>
                <RiFullscreenExitLine className="size-4" />
              </ChromeButton>
            )}
            <ViewerControlsMenu
              {...viz.menu}
              container={portalContainer}
              isFullscreen={isFullscreen}
            />
            {viz.menu.onToggleElectrodes &&
              viz.menu.showElectrodes !== false &&
              viz.electrodesInteractive !== false && (
                <ElectrodeInteractionHelp container={portalContainer} />
              )}
            {/* Present exactly when locations can be picked — the same condition that puts the
                marker-size slider in the menu. */}
            {viz.menu.onMorphologyLocationRadiusChange && (
              <MorphologyLocationHelp container={portalContainer} />
            )}
          </div>
        )}
      </div>

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
          <div ref={toolbarRef} className="flex items-center gap-1">
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
    </div>
  );
}

function ChromeButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-full transition-colors',
            'shadow-md ring-1 ring-black/5 focus-visible:outline-none',
            active ? 'bg-primary-8 text-white' : 'bg-white text-neutral-500 hover:bg-neutral-100'
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent
        align="center"
        side="bottom"
        sideOffset={0}
        arrowClassName="bg-gray-200"
        className="text-primary-9 bg-gray-200"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
