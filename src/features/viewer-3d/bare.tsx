'use client';

import { createContext, useContext, useMemo } from 'react';

import type { ReactNode } from 'react';
import type { CameraPose, FrameBox, ViewFrame } from './engine/scene-view';

const BareContext = createContext(false);

/**
 * The 3D views inside drawn bare, for a page that sets them into its own layout: the canvas
 * without the settings, buttons, gizmo, hints or status over it. Colour-by is the one control
 * kept, and only where the host gives it a place.
 */
export function BareViewers({ children }: { children: ReactNode }) {
  return <BareContext.Provider value>{children}</BareContext.Provider>;
}

/** Whether this view is drawn bare; see {@link BareViewers}. */
export function useBareViewer(): boolean {
  return useContext(BareContext);
}

/**
 * A 3D view, as far as drawing over it goes: it tells what each of its frames was drawn with, and
 * may be framed on a box of its content's own frame, µm, in place of its content.
 */
export interface FramedView {
  onFrame(listener: (frame: ViewFrame) => void): () => void;
  setFrameBox?(box: FrameBox | null): void;
  /** Hold the camera at `pose`, in the content's own frame, whatever framing comes; null lets it go to its framing. */
  holdCamera?(pose: CameraPose | null): void;
  /** The camera as the view's framing leaves it, and as it is now. */
  framedCamera?(): CameraPose | null;
  cameraNow?(): CameraPose | null;
}

/**
 * What a host draws over each view inside, the box it frames the view on, how finely the view draws, and
 * who is told it is built.
 */
interface Overlay {
  render: (view: FramedView) => ReactNode;
  frame: FrameBox | null;
  detailPixels?: number;
  pack?: OwnPack;
  onBuilt?: () => void;
}

/** A circuit's morphology pack the app serves itself, made lighter for one view: where, how large, its SHA-256. */
export interface OwnPack {
  id: string;
  url: string;
  size: number;
  sha256: string;
}

const OverlayContext = createContext<Overlay | null>(null);

/**
 * `render` drawn over each 3D view inside, in step with it: a layer of the host's own, such as a
 * brain round the cells on show; with `frame`, each view is framed on that box from its first frame;
 * with `detailPixels`, a level of a pack is fine enough where its tolerance spans that many device
 * pixels, coarser than the viewer's own and so in sooner; with `pack`, a circuit's morphologies are
 * read from it rather than from the circuit's own; `onBuilt` told once a view's cells are all in and
 * drawn as finely as it wants them.
 */
export function ViewOverlay({
  render,
  frame = null,
  detailPixels,
  pack,
  onBuilt,
  children,
}: {
  render: (view: FramedView) => ReactNode;
  frame?: FrameBox | null;
  detailPixels?: number;
  pack?: OwnPack;
  onBuilt?: () => void;
  children: ReactNode;
}) {
  const overlay = useMemo(
    () => ({ render, frame, detailPixels, pack, onBuilt }),
    [render, frame, detailPixels, pack, onBuilt]
  );
  return <OverlayContext.Provider value={overlay}>{children}</OverlayContext.Provider>;
}

/** What to draw over this view, and where to frame it, if anything; see {@link ViewOverlay}. */
export function useViewOverlay(): Overlay | null {
  return useContext(OverlayContext);
}
