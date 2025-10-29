import React from 'react';
import {
  ArrayNumber2,
  tgdActionCreateCameraInterpolation,
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
  TgdQuat,
  TgdTexture2D,
  TgdVec3,
  webglPresetBlend,
  webglPresetDepth,
} from '@tolokoban/tgd';

import { computeSectionOffset } from './math';
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

  public readonly eventTap = new GenericEvent<{
    offset: number;
    item: StructureItem | null;
  }>();

  public readonly eventZoom = new GenericEvent<number>();

  private _morphology: Morphology | null = null;

  private _canvas: HTMLCanvasElement | null = null;

  private context: TgdContext | null = null;

  private offscreen: OffscreenPainter | null = null;

  private palette: TgdTexture2D | null = null;

  private hoverPainter: TgdPainter | null = null;

  private hoverItem: StructureItem | null = null;

  private minDistance = 1;

  private maxDistance = 2;

  private initialPosition = new TgdVec3();

  private readonly segmentsPerSection = new Map<string, StructureItem[]>();

  get zoom() {
    const { context } = this;
    if (!context) return 0;

    return tgdCalcMapRange(
      context.camera.transfo.distance,
      this.maxDistance,
      this.minDistance,
      -1,
      +1
    );
  }

  set zoom(value: number) {
    if (Math.abs(value - this.zoom) < 1e-6) return;

    const { context } = this;
    if (context) {
      const distance = tgdCalcMapRange(value, -1, +1, this.maxDistance, this.minDistance, true);
      context.camera.transfo.distance = distance;
      this.eventZoom.dispatch(value);
      context.paint();
    }
  }

  readonly zoomOut = () => {
    this.zoom -= 0.1;
  };

  readonly zoomIn = () => {
    this.zoom += 0.1;
  };

  get canvas() {
    return this._canvas;
  }

  set canvas(canvas: HTMLCanvasElement | null) {
    if (this._canvas === canvas) return;

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

  readonly resetCamera = () => {
    const { context } = this;
    if (!context) return;

    const action = tgdActionCreateCameraInterpolation(context.camera, {
      distance: (this.minDistance + this.maxDistance) / 2,
      orientation: new TgdQuat(),
      position: this.initialPosition,
    });
    context.animSchedule({
      action: (t: number) => {
        action(t);
        this.eventZoom.dispatch(this.zoom);
      },
      duration: 0.3,
    });
  };

  delete() {
    if (this.context) {
      this.context.delete();
      this.context = null;
    }
    this.offscreen?.delete();
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
    this.context = context;
    context.camera = makeCamera(structure.bbox);
    this.initialPosition.from(context.camera.transfo.position);
    const palette = new TgdTexture2D(context)
      .loadBitmap(tgdCanvasCreatePalette(PALETTE))
      .setParams({
        magFilter: 'NEAREST',
        minFilter: 'NEAREST',
      });
    this.palette = palette;
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
    this.maxDistance = maxDistance;
    const minDistance = maxDistance / 10;
    this.minDistance = minDistance;
    context.camera.transfo.distance = (minDistance + maxDistance) / 2;
    const orbitter = new TgdControllerCameraOrbit(context, {
      geo: {
        minLat: tgdCalcDegToRad(-60),
        maxLat: tgdCalcDegToRad(+60),
      },
      inertiaOrbit: 500,
      inertiaZoom: 500,
      minDistance,
      maxDistance,
      speedZoom: (maxDistance - minDistance) / 2,
    });
    orbitter.enabled = true;
    orbitter.eventChange.addListener(() => {
      this.eventZoom.dispatch(
        tgdCalcMapRange(context.camera.transfo.distance, maxDistance, minDistance, -1, +1)
      );
    });

    this.offscreen = new OffscreenPainter(context, structure);
    context.inputs.pointer.eventHover.addListener((evt) => {
      const { x, y } = evt.current;
      const item = this.offscreen?.getItemAt(x, y) ?? null;
      if (item !== this.hoverItem) {
        if (this.hoverPainter) {
          groupHover.remove(this.hoverPainter);
          context.paint();
        }
        this.hoverItem = item ?? null;
        this.eventHover.dispatch({ x, y, item });
        if (item) {
          this.hoverPainter = this.makeHoverPainter(item);
          if (this.hoverPainter) {
            groupHover.add(this.hoverPainter);
          }
        }
        context.paint();
      }
    });
    context.inputs.pointer.eventTap.addListener((evt) => {
      if (!context) return;

      const { x, y } = evt;
      const item = this.offscreen?.getItemAt(x, y) ?? null;
      this.hoverItem = item ?? null;
      if (item) {
        const segment = computeSectionOffset(structure, item, context.camera, x, y);
        this.eventTap.dispatch({
          offset: segment,
          item: this.hoverItem,
        });
      }
    });
  }

  private makeHoverPainter(item: StructureItem): TgdPainter | null {
    const { context, palette } = this;
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

export function usePainterManager() {
  const refPainter = React.useRef<PainterManager | null>(null);
  if (!refPainter.current) {
    refPainter.current = new PainterManager();
  }
  React.useEffect(() => {
    return () => refPainter.current?.delete();
  }, []);
  return refPainter.current;
}
