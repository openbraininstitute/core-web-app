import { RiArrowDownSLine, RiFocus3Line } from '@remixicon/react';
import chroma from 'chroma-js';
import { useState } from 'react';

import { morphologyDebugFlag, useFlag } from '@/features/feature-flags';
import {
  ChromeButton,
  FullscreenButton,
} from '@/features/scan-config/components/color-by/chrome-button';
import { panelStyle, viewerTheme } from '@/features/scan-config/components/color-by/contrast';
import { cn } from '@/utils/css-class';

import { currentPalette, type ViewerActions, type ViewerSettings } from '../use-viewer-settings';
import { ColorByMenu } from './color-by-menu';
import { DebugMenu } from './debug-menu';
import { NeuritesKey } from './neurites-key';
import { Scalebar } from './scalebar';
import { SettingsMenu } from './settings-menu';
import { BuildStatus, WheelHint } from './status';

import type { Look } from '../engine/looks';
import type { Viewer } from '../engine/viewer';
import type { MorphologyMeshState } from '../use-morphology-mesh';

import styles from '@/features/scan-config/components/color-by/chrome-animations.module.css';

interface MorphoViewerChromeProps {
  viewer: Viewer;
  /** What the fullscreen button blows up. */
  root: HTMLElement | null;
  settings: ViewerSettings;
  actions: ViewerActions;
  mesh: MorphologyMeshState;
  /** The morphology's name, for the Debug menu. */
  name: string;
  wheelHint: boolean;
  /** The farthest path distance from the soma, once the workers have measured it. */
  maxDistance: number | null;
  /** Why the path distances could not be measured. */
  distanceError: string | null;
}

/**
 * The control layer over the morphology, laid out as the circuit viewer's: fullscreen, settings and,
 * where its flag is on, debug (top-left), re-centre under them, the colours and their key (top-right),
 * the build's status (top-centre) and the ruler (bottom-left).
 */
export function MorphoViewerChrome({
  viewer,
  root,
  settings,
  actions,
  mesh,
  name,
  wheelHint,
  maxDistance,
  distanceError,
}: MorphoViewerChromeProps) {
  const [keyOpen, setKeyOpen] = useState(true);
  const debug = useFlag(morphologyDebugFlag.key);
  const { update } = actions;
  const look = viewer.looks.find((l) => l.id === settings.look) ?? viewer.looks[0];
  // The chrome reads against the look's background, not the Background switch: SEM is black in either.
  const theme = viewerTheme(isDarkBackground(look.background[settings.dark ? 'dark' : 'light']));
  const reason = colorsReason(look, settings.typeTint);
  const types = new Set(mesh.summary?.types.map((t) => t.type));

  // A look can come with its own bumps and occlusion; they stay on for the next look, to be turned off by hand.
  const chooseLook = (id: string) => {
    const next = viewer.looks.find((l) => l.id === id);
    if (!next) return;
    update({
      look: id,
      ...(next.bumps && { bumps: true, bump: next.bumps }),
      ...(next.ao && { ao: true }),
    });
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="pointer-events-auto absolute top-3 left-3 flex flex-col items-start gap-2">
        <div className="flex items-center gap-2">
          <FullscreenButton target={root} />
          <SettingsMenu
            settings={settings}
            update={update}
            looks={viewer.looks}
            look={look}
            onLook={chooseLook}
            hasMesh={mesh.layers.mesh !== null}
          />
          {debug && <DebugMenu name={name} state={mesh} palette={currentPalette(settings)} />}
        </div>
        <ChromeButton
          label="Re-centre view"
          testId="viewer-reset-view"
          onClick={() => viewer.resetView()}
        >
          <RiFocus3Line className="size-4" />
        </ChromeButton>
      </div>

      <div className="pointer-events-auto absolute top-3 right-3 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1">
          <ColorByMenu
            value={settings.colorBy}
            onChange={(colorBy) => update({ colorBy })}
            theme={theme}
            reason={reason}
          />
          <button
            type="button"
            aria-label={keyOpen ? 'Hide neurite colours' : 'Show neurite colours'}
            aria-expanded={keyOpen}
            onClick={() => setKeyOpen((open) => !open)}
            style={panelStyle(theme)}
            className={cn(
              styles.legendToggle,
              'ml-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full backdrop-blur-sm transition-colors hover:brightness-110 focus-visible:outline-none'
            )}
          >
            <RiArrowDownSLine
              className={cn(styles.chevronIcon, 'size-4', keyOpen && styles.chevronIconOpen)}
            />
          </button>
        </div>
        {keyOpen && (
          <div className={styles.panelReveal}>
            <NeuritesKey
              settings={settings}
              actions={actions}
              types={types}
              look={look}
              theme={theme}
              reason={reason}
              maxDistance={maxDistance}
              distanceError={distanceError}
            />
          </div>
        )}
      </div>

      <BuildStatus mesh={mesh} theme={theme} />
      {settings.scalebar && settings.projection === 'orthographic' && (
        <Scalebar viewer={viewer} color={theme.foreground} />
      )}
      <WheelHint visible={wheelHint} theme={theme} />
    </div>
  );
}

function colorsReason(look: Look, typeTint: boolean): string | null {
  if (look.colors === 'own') return `${look.label} draws in colours of its own.`;
  if (look.colors === 'tint' && !typeTint) {
    return 'Turn on Type tint in the settings to use the neurite colours.';
  }
  return null;
}

/** Whether light text reads better than dark over a background gradient, top to bottom. */
function isDarkBackground([top, bottom]: [string, string]): boolean {
  const middle = chroma.mix(top, bottom, 0.5, 'rgb');
  return chroma.contrast(middle, '#fff') > chroma.contrast(middle, '#000');
}
