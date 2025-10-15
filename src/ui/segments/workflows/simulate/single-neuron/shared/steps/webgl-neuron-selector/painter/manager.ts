import React from 'react';
import {
  tgdCalcDegToRad,
  TgdContext,
  TgdControllerCameraOrbit,
  TgdPainterClear,
  TgdPainterSegments,
  TgdPainterState,
  webglPresetDepth,
} from '@tolokoban/tgd';

import { makeSegment as makeSegments } from './segments';
import { makeCamera } from './camera';

import { Morphology } from '@/services/bluenaas-single-cell/types';

export class PainterManager {
  private _context: TgdContext | null = null;

  private _morphology: Morphology | null = null;

  private _canvas: HTMLCanvasElement | null = null;

  get canvas() {
    return this._canvas;
  }

  set canvas(canvas: HTMLCanvasElement | null) {
    this._canvas = canvas;
    this.initialize();
  }

  get morphology() {
    return this._morphology;
  }

  set morphology(morphology: Morphology | null) {
    this._morphology = morphology;
    this.initialize();
  }

  delete() {
    if (this._context) {
      this._context.delete();
      this._context = null;
    }
  }

  private initialize() {
    const { canvas, morphology } = this;
    if (!canvas || !morphology) return;

    const { segments, bbox } = makeSegments(morphology);
    const context = new TgdContext(canvas, {
      alpha: false,
      antialias: true,
    });
    context.camera = makeCamera(bbox);
    context.add(
      new TgdPainterClear(context, { color: [0, 0, 0, 1], depth: 1 }),
      new TgdPainterState(context, {
        depth: webglPresetDepth.lessOrEqual,
        children: [
          new TgdPainterSegments(context, {
            makeDataset: segments.makeDataset,
          }),
        ],
      })
    );
    context.paint();

    const maxDistance = context.camera.transfo.distance;
    const minDistance = maxDistance / 10;
    const orbitter = new TgdControllerCameraOrbit(context, {
      geo: {
        minLat: tgdCalcDegToRad(-0),
        maxLat: tgdCalcDegToRad(+0),
      },
      inertiaOrbit: 500,
      inertiaZoom: 500,
      minDistance,
      maxDistance,
      speedZoom: maxDistance,
    });
    orbitter.enabled = true;
  }
}

export function usePainterManager(morphology: Morphology | null) {
  const refPainter = React.useRef<PainterManager | null>(null);
  if (!refPainter.current) refPainter.current = new PainterManager();
  React.useEffect(() => {
    if (refPainter.current) refPainter.current.morphology = morphology;
  }, [morphology]);
  React.useEffect(() => {
    return () => refPainter.current?.delete();
  }, []);
  return refPainter.current;
}
