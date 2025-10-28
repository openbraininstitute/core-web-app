import React from 'react';
import {
  ArrayNumber2,
  tgdCalcClamp,
  tgdCalcDegToRad,
  tgdCalcMapRange,
  tgdCanvasCreatePalette,
  TgdContext,
  TgdControllerCameraOrbit,
  TgdLight,
  TgdMaterialDiffuse,
  TgdMaterialFlat,
  TgdPainter,
  TgdPainterClear,
  TgdPainterSegments,
  TgdPainterSegmentsData,
  TgdPainterState,
  TgdTexture2D,
  TgdVec3,
  webglPresetBlend,
  webglPresetDepth,
} from '@tolokoban/tgd';

import { makeSegments } from './segments';
import { makeCamera } from './camera';
import { Structure, StructureItem, StructureItemType } from './structure';
import { OffscreenPainter } from './offscreen-painter';

import { Morphology } from '@/services/bluenaas-single-cell/types';
import GenericEvent from '@/util/generic-event';

const PALETTE: string[] = [];
PALETTE[StructureItemType.Axon] = '#b00';
PALETTE[StructureItemType.Dendrite] = '#F44';
PALETTE[StructureItemType.ApicalDendrite] = '#F88';
PALETTE[StructureItemType.Myelin] = `#f38`;
PALETTE[StructureItemType.Selected] = '#fc0';
PALETTE[StructureItemType.Soma] = '#afa';
PALETTE[StructureItemType.Unknown] = '#a6f';

export class PainterManager {
  public readonly eventHover = new GenericEvent<{
    x: number;
    y: number;
    item: StructureItem | null;
  }>();

  public readonly eventZoom = new GenericEvent<number>();

  private _context: TgdContext | null = null;

  private _morphology: Morphology | null = null;

  private _canvas: HTMLCanvasElement | null = null;

  private _offscreen: OffscreenPainter | null = null;

  private _palette: TgdTexture2D | null = null;

  private _hoverPainter: TgdPainter | null = null;

  private _hoverItem: StructureItem | null = null;

  private _zoom = 0;

  get zoom() {
    return this._zoom;
  }

  set zoom(value: number) {
    this._zoom = tgdCalcClamp(value, -1, +1);
    this.eventZoom.dispatch(this._zoom);
  }

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
    this._context = context;
    context.camera = makeCamera(structure.bbox);
    const palette = new TgdTexture2D(context)
      .loadBitmap(tgdCanvasCreatePalette(PALETTE))
      .setParams({
        magFilter: 'NEAREST',
        minFilter: 'NEAREST',
      });
    this._palette = palette;
    const groupHover = new TgdPainterState(context, {
      blend: webglPresetBlend.add,
    });
    context.add(
      new TgdPainterClear(context, { color: [0, 0, 0, 1], depth: 1 }),
      new TgdPainterState(context, {
        depth: webglPresetDepth.less,
        children: [
          new TgdPainterSegments(context, {
            minRadius: 1,
            makeDataset: segments.makeDataset,
            material: new TgdMaterialDiffuse({
              color: palette,
              specularExponent: 1,
              specularIntensity: 0.25,
              lockLightsToCamera: true,
              light: new TgdLight({
                direction: new TgdVec3(0, 0, -1),
              }),
            }),
          }),
          groupHover,
        ],
      })
    );
    context.paint();

    const maxDistance = context.camera.transfo.distance;
    const minDistance = maxDistance / 10;
    this.eventZoom.addListener((zoom) => {
      context.camera.transfo.distance = tgdCalcMapRange(zoom, -1, +1, maxDistance, minDistance);
    });
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
    // context.inputs.pointer.eventHover.addListener((evt) => {
    context.inputs.pointer.eventHover.addListener((evt) => {
      const { x, y } = evt.current;
      const item = this._offscreen?.getItemAt(x, y) ?? null;
      if (item !== this._hoverItem) {
        if (this._hoverPainter) {
          groupHover.remove(this._hoverPainter);
          context.paint();
        }
        this._hoverItem = item ?? null;
        this.eventHover.dispatch({ x, y, item });
        if (item) {
          this._hoverPainter = this.makeHoverPainter(item);
          if (this._hoverPainter) {
            groupHover.add(this._hoverPainter);
          }
        }
        context.paint();
      }
    });
  }

  private makeHoverPainter(item: StructureItem): TgdPainter | null {
    const { _context: context, _palette: palette } = this;
    if (!context || !palette) return null;

    const segments = new TgdPainterSegmentsData();
    const uv: ArrayNumber2 = [
      (StructureItemType.Selected + 0.5) / (StructureItemType.Unknown + 1),
      0,
    ];
    const radius = item.radius * 1.4;
    segments.add([...item.start, radius], [...item.end, radius], uv, uv);

    return new TgdPainterSegments(context, {
      roundness: 32,
      minRadius: 1.5,
      makeDataset: segments.makeDataset,
      material: new TgdMaterialFlat({
        color: [0.6, 0.4, 0.1, 1],
      }),
    });
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
