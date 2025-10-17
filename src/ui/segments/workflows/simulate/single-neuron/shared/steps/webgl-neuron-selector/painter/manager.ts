import React from 'react';
import {
  tgdCalcDegToRad,
  tgdCanvasCreatePalette,
  TgdContext,
  TgdControllerCameraOrbit,
  TgdMaterialDiffuse,
  TgdPainterClear,
  TgdPainterSegments,
  TgdPainterState,
  TgdTexture2D,
  webglPresetDepth,
} from '@tolokoban/tgd';

import { makeSegments } from './segments';
import { makeCamera } from './camera';
import { Structure, StructureItemType } from './structure';
import { OffscreenPainter } from './offscreen-painter';

import { Morphology } from '@/services/bluenaas-single-cell/types';

const PALETTE: string[] = [];
PALETTE[StructureItemType.Axon] = '#05c';
PALETTE[StructureItemType.Dendrite] = '#06b';
PALETTE[StructureItemType.Selected] = '#fb0';
PALETTE[StructureItemType.Soma] = '#777';
PALETTE[StructureItemType.Unknown] = '#00d';

export class PainterManager {
  private _context: TgdContext | null = null;

  private _morphology: Morphology | null = null;

  private _canvas: HTMLCanvasElement | null = null;

  private _offscreen: OffscreenPainter | null = null;

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
    this._offscreen?.delete();
  }

  private initialize() {
    const { canvas, morphology } = this;
    if (!canvas || !morphology) return;

    const structure = new Structure(morphology);
    const segments = makeSegments(structure);
    const context = new TgdContext(canvas, {
      alpha: false,
      antialias: true,
    });
    context.camera = makeCamera(structure.bbox);
    const palette = new TgdTexture2D(context)
      .loadBitmap(tgdCanvasCreatePalette(PALETTE))
      .setParams({
        magFilter: 'NEAREST',
        minFilter: 'NEAREST',
      });
    context.add(
      new TgdPainterClear(context, { color: [0, 0, 0, 1], depth: 1 }),
      new TgdPainterState(context, {
        depth: webglPresetDepth.lessOrEqual,
        children: [
          new TgdPainterSegments(context, {
            minRadius: 0.25,
            makeDataset: segments.makeDataset,
            material: new TgdMaterialDiffuse({
              color: palette,
              specularExponent: 20,
              specularIntensity: 0.5,
            }),
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

    this._offscreen = new OffscreenPainter(context, structure);
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
