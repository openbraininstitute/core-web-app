'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';
import { FullscreenPortalScope, toggleFullscreen } from '@/utils/fullscreen';

import { MorphoViewerChrome } from './chrome/morpho-viewer-chrome';
import { defaultPoolSize, MeshPool } from './engine/pool';
import { Viewer } from './engine/viewer';
import { type Engine, useMorphologyMesh } from './use-morphology-mesh';
import { usePathDistances } from './use-path-distances';
import { useSignal } from './use-signal';
import { currentPalette, useViewerSettings, type ViewerSettings } from './use-viewer-settings';

import type { DistanceData } from './engine/colors';

interface MorphoViewerProps {
  className?: string;
  /**
   * Text content of a SWC file.
   */
  swc: string;
  /** The morphology's name, for the stats. */
  name: string;
}

function MorphoViewerComponent({ className, swc, name }: MorphoViewerProps) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const refHost = useRef<HTMLDivElement | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const { settings, ...actions } = useViewerSettings();
  const mesh = useMorphologyMesh(engine, swc, settings.hiddenTypes, settings.build);
  const { distances, error: distanceError } = usePathDistances(
    engine?.pool ?? null,
    mesh.layers,
    settings.colorBy === 'distance'
  );
  const [wheelHint, setWheelHint] = useSignal(10000);
  const viewer = engine?.viewer ?? null;

  useEffect(() => {
    const host = refHost.current;
    if (!host) return;
    const created = { viewer: new Viewer(host), pool: new MeshPool(defaultPoolSize()) };
    setEngine(created);
    return () => {
      setEngine(null);
      created.pool.dispose();
      created.viewer.dispose();
    };
  }, []);

  useEffect(() => viewer?.onWheelWithoutCtrl(() => setWheelHint(true)), [viewer, setWheelHint]);

  useViewerSync(viewer, settings, distances);

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      ref={setRoot}
      data-testid="morpho-viewer"
    >
      <FullscreenPortalScope root={root}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: if you are blind, fullscreen won't give you more information */}
        <div
          className="absolute inset-0"
          ref={refHost}
          onDoubleClick={() => toggleFullscreen(root)}
        />
        {viewer && (
          <MorphoViewerChrome
            viewer={viewer}
            root={root}
            settings={settings}
            actions={actions}
            mesh={mesh}
            name={name}
            wheelHint={wheelHint}
            maxDistance={distances?.max ?? null}
            distanceError={distanceError}
          />
        )}
      </FullscreenPortalScope>
    </div>
  );
}

/** Apply the settings to the viewer, each as it changes. */
function useViewerSync(
  viewer: Viewer | null,
  settings: ViewerSettings,
  distances: DistanceData | null
) {
  const palette = currentPalette(settings);
  useEffect(() => {
    if (!viewer) return;
    // A colour picker sends a stream of changes: one write of the mesh's colours per frame.
    const frame = requestAnimationFrame(() => viewer.setColors(palette, distances));
    return () => cancelAnimationFrame(frame);
  }, [viewer, palette, distances]);
  useEffect(() => viewer?.setDark(settings.dark), [viewer, settings.dark]);
  useEffect(() => viewer?.setHiddenTypes(settings.hiddenTypes), [viewer, settings.hiddenTypes]);
  useEffect(() => viewer?.setLook(settings.look), [viewer, settings.look]);
  useEffect(() => viewer?.setTypeTint(settings.typeTint), [viewer, settings.typeTint]);
  useEffect(() => viewer?.setAO(settings.ao), [viewer, settings.ao]);
  useEffect(
    () =>
      viewer?.setBumps({
        ...settings.bump,
        amplitude: settings.bumps ? settings.bump.amplitude : 0,
      }),
    [viewer, settings.bumps, settings.bump]
  );
  useEffect(() => viewer?.setMinWidth(settings.minWidth), [viewer, settings.minWidth]);
  useEffect(() => viewer?.showMesh(settings.showMesh), [viewer, settings.showMesh]);
  useEffect(() => viewer?.setWireframe(settings.wireframe), [viewer, settings.wireframe]);
  useEffect(() => viewer?.showSkeleton(settings.skeleton), [viewer, settings.skeleton]);
  useEffect(() => viewer?.setSpin(settings.spin), [viewer, settings.spin]);
  useEffect(() => viewer?.setProjection(settings.projection), [viewer, settings.projection]);
}

const MorphoViewer = dynamic(() => Promise.resolve(MorphoViewerComponent), {
  ssr: false,
});

export { MorphoViewer };
