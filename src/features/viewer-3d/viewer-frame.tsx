import { useEffect, useState } from 'react';

import { cn } from '@/utils/css-class';
import { FullscreenPortalScope, toggleFullscreen } from '@/utils/fullscreen';

import { useSignal } from './use-signal';

import type { ReactNode, RefObject } from 'react';
import type { Projection, SceneViewer } from './engine/scene-viewer';

/** A viewer's element, which double-clicking takes fullscreen: the host of its canvas, and its chrome over it. */
export function ViewerFrame({
  className,
  testId,
  hostRef,
  children,
}: {
  className?: string;
  testId: string;
  hostRef: RefObject<HTMLDivElement | null>;
  /** The chrome, given what the fullscreen button blows up. */
  children(root: HTMLDivElement | null): ReactNode;
}) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  return (
    <div className={cn('relative overflow-hidden', className)} ref={setRoot} data-testid={testId}>
      <FullscreenPortalScope root={root}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: if you are blind, fullscreen won't give you more information */}
        <div
          className="absolute inset-0"
          ref={hostRef}
          onDoubleClick={() => toggleFullscreen(root)}
        />
        {children(root)}
      </FullscreenPortalScope>
    </div>
  );
}

/** For a while after a wheel turned outside fullscreen without Ctrl, which scrolls the page: the hint to hold it. */
export function useWheelHint(viewer: SceneViewer | null): boolean {
  const [hint, setHint] = useSignal(10000);
  useEffect(() => viewer?.onWheelWithoutCtrl(() => setHint(true)), [viewer, setHint]);
  return hint;
}

/** Apply the settings every viewer has, each as it changes. */
export function useSceneSync(
  viewer: SceneViewer | null,
  settings: { dark: boolean; look: string; ao: boolean; spin: boolean; projection: Projection }
): void {
  useEffect(() => viewer?.setDark(settings.dark), [viewer, settings.dark]);
  useEffect(() => viewer?.setLook(settings.look), [viewer, settings.look]);
  useEffect(() => viewer?.setAO(settings.ao), [viewer, settings.ao]);
  useEffect(() => viewer?.setSpin(settings.spin), [viewer, settings.spin]);
  useEffect(() => viewer?.setProjection(settings.projection), [viewer, settings.projection]);
}
