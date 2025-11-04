import React from 'react';
import {
  ArrayNumber2,
  tgdCalcMapRange,
  tgdCanvasCreatePalette,
  TgdContext,
  TgdControllerCameraOrbit,
  TgdLight,
  TgdMat4,
  TgdMaterialDiffuse,
  TgdPainter,
  TgdPainterClear,
  TgdPainterGroup,
  TgdPainterSegments,
  TgdPainterSegmentsData,
  TgdPainterState,
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
PALETTE[StructureItemType.Axon] = '#07f';
PALETTE[StructureItemType.Dendrite] = '#F44';
PALETTE[StructureItemType.ApicalDendrite] = '#F8f';
PALETTE[StructureItemType.Myelin] = `#778`;
PALETTE[StructureItemType.Soma] = '#dde';
PALETTE[StructureItemType.Selected] = '#fc0';
PALETTE[StructureItemType.Unknown] = '#a6f';

export class PainterManager {
  private static id = 0;

  public readonly id = PainterManager.id++;

  public readonly eventPaint = new GenericEvent<void>();

  public readonly eventHover = new GenericEvent<{
    x: number;
    y: number;
    item: StructureItem | null;
    offset: number;
  }>();

  public readonly eventTap = new GenericEvent<{
    offset: number;
    item: StructureItem | null;
  }>();

  /** Event for normalized zoom changes. */
  public readonly eventZoom = new GenericEvent<number>();

  public readonly eventRestingPosition = new GenericEvent<boolean>();

  private _morphology: Morphology | null = null;

  private _canvas: HTMLCanvasElement | null = null;

  private context: TgdContext | null = null;

  private offscreen: OffscreenPainter | null = null;

  private structure: Structure | null = null;

  private palette: TgdTexture2D | null = null;

  private groupHover = new TgdPainterGroup();

  private hoverPainter: TgdPainter | null = null;

  private hoverItem: StructureItem | null = null;

  private initialPosition = new TgdVec3();

  private cameraController: TgdControllerCameraOrbit | null = null;

  /**
   * When is the last time the camera moved?
   * We use this to prevent a quick camera moved
   * from being interpreted as a click.
   * Because a click will bring a modal window to add
   * recording.
   */
  private lastCameraChangeTimestamp = 0;

  /**
   * This normalized zoom is between -1 and +1.
   */
  get zoom() {
    const { context, cameraController } = this;
    if (!context || !cameraController) return 0;

    return this.toNormalizedZoom(cameraController.zoom);
  }

  set zoom(value: number) {
    const { cameraController } = this;
    if (!cameraController) return;

    if (Math.abs(value - this.zoom) < 1e-6) return;

    if (value !== 0) this.eventRestingPosition.dispatch(false);
    const zoom = this.toControllerZoom(value);
    cameraController.zoom = zoom;
    this.eventZoom.dispatch(value);
    this.context?.paint();
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

  getCameraMatrix(): Readonly<TgdMat4> {
    const { context } = this;
    if (!context) return new TgdMat4();

    const { camera } = context;
    return new TgdMat4(camera.matrixProjection).multiply(camera.matrixModelView);
  }

  readonly resetCamera = () => {
    const { context, cameraController } = this;
    if (!context || !cameraController) return;

    const { zoom } = this;
    cameraController.reset(0.3333, {
      onAction: (t: number) => {
        this.eventZoom.dispatch(tgdCalcMapRange(t, 0, 1, zoom, 0));
      },
      onEnd: () => this.eventRestingPosition.dispatch(true),
    });
  };

  delete() {
    if (this.context) {
      this.context.debugHierarchy('Delete this context! ' + this.context.name);
      this.context.delete();
      this.context = null;
    }
    if (this.offscreen) {
      this.offscreen.delete();
      this.offscreen = null;
    }
  }

  /**
   * We look for the segment defined by `offset` and
   * we return the 3D point in it.
   * @param sectionName
   * @param offset
   */
  getSectionCoordinates(sectionName: string, offset: number): TgdVec3 {
    const { structure } = this;
    if (!structure) return new TgdVec3();

    const segments = structure.getSegmentsOfSection(sectionName) ?? [];
    const totalDistance = segments.reduce((dist, item) => dist + item.length, 0);
    const targetDistance = totalDistance * offset;
    let distance = 0;
    for (const segment of segments) {
      const previousDistance = distance;
      distance += segment.length;
      if (distance >= targetDistance) {
        const segmentOffset = (targetDistance - previousDistance) / segment.length;
        const point = TgdVec3.newFromMix(segment.start, segment.end, segmentOffset);
        return point;
      }
    }
    return new TgdVec3();
  }

  getSegment(sectionName: string, sectionOffset: number): StructureItem | null {
    const { structure } = this;
    if (!structure) return null;

    const segments = structure.getSegmentsOfSection(sectionName);
    if (!segments) return null;

    const totalDistance = segments.reduce((dist, item) => dist + item.length, 0);
    const targetDistance = totalDistance * sectionOffset;
    let distance = 0;
    for (const segment of segments) {
      distance += segment.length;
      if (distance >= targetDistance) return segment;
    }
    return null;
  }

  private initialize() {
    const { canvas, morphology } = this;
    if (!canvas || !morphology) return;

    if (this.context) this.context.delete();
    if (this.cameraController) this.cameraController.detach();
    const structure = new Structure(morphology);
    this.structure = structure;
    const context = new TgdContext(canvas, {
      alpha: false,
      antialias: true,
    });
    context.eventPaint.addListener(() => this.eventPaint.dispatch());
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
    this.initTgdPainters(context, structure, palette);
    this.initCameraController(context);
    this.initOffscreen(context, structure);
  }

  private initOffscreen(context: TgdContext, structure: Structure) {
    this.offscreen = new OffscreenPainter(context, structure);
    context.inputs.pointer.eventHover.addListener((evt) => {
      const { groupHover } = this;
      const { x, y } = evt.current;
      const item = this.offscreen?.getItemAt(x, y) ?? null;
      if (item !== this.hoverItem) {
        if (this.hoverPainter) {
          groupHover.remove(this.hoverPainter);
          this.hoverPainter = null;
        }
        this.hoverItem = item ?? null;
        let offset = 0;
        if (item) {
          this.hoverPainter = this.makeHoverPainter(item);
          if (this.hoverPainter) {
            groupHover.add(this.hoverPainter);
            offset = computeSectionOffset(structure, item, context.camera, x, y);
          }
        }
        this.context?.paint();
        this.eventHover.dispatch({ x, y, item, offset });
      }
    });
    context.inputs.pointer.eventTap.addListener((evt) => {
      // Prevent camera movement to be interpreted as a click.
      if (Date.now() - this.lastCameraChangeTimestamp < 300) return;

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

  private initCameraController(context: TgdContext) {
    const cameraController = new TgdControllerCameraOrbit(context, {
      inertiaOrbit: 500,
      inertiaZoom: 250,
      minZoom: 0.2,
      maxZoom: 5,
      speedZoom: 1,
      onZoomRequest: ({ zoom }) => {
        this.eventZoom.dispatch(this.toNormalizedZoom(zoom));
        return true;
      },
    });
    this.cameraController = cameraController;
    cameraController.eventChange.addListener(() => {
      // Remember last camera movement to prevent false clicks.
      this.lastCameraChangeTimestamp = Date.now();
      this.eventRestingPosition.dispatch(false);
    });
  }

  private initTgdPainters(context: TgdContext, structure: Structure, palette: TgdTexture2D) {
    const groupHover = new TgdPainterState(context, {
      blend: webglPresetBlend.add,
    });
    const segments = makeSegments(structure);
    context.add(
      new TgdPainterClear(context, { color: [0, 0, 0, 1], depth: 1 }),
      new TgdPainterState(context, {
        depth: webglPresetDepth.less,
        children: [
          new TgdPainterSegments(context, {
            roundness: 6,
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
    context.debugHierarchy('INIT');
    this.groupHover = groupHover;
  }

  /**
   * @param controllerZoom Between `this.controller.minZoom` and `this.controller.maxZoom`.
   * @returns The normalized zoom between -1 and +1.
   */
  private toNormalizedZoom(controllerZoom: number) {
    const { cameraController } = this;
    if (!cameraController) return 0;

    const { minZoom, maxZoom } = cameraController;
    if (controllerZoom < 1) {
      return tgdCalcMapRange(controllerZoom, 1, minZoom, 0, -1, true);
    }
    return tgdCalcMapRange(controllerZoom, 1, maxZoom, 0, +1, true);
  }

  /**
   * @param normalizedZoom Between -1 and +1.
   * @returns The controller zoom between `this.controller.minZoom` and `this.controller.maxZoom`.
   */
  private toControllerZoom(normalizedZoom: number) {
    const { cameraController } = this;
    if (!cameraController) return 1;

    const { minZoom, maxZoom } = cameraController;
    if (normalizedZoom < 0) {
      return tgdCalcMapRange(normalizedZoom, 0, -1, 1, minZoom, true);
    }
    return tgdCalcMapRange(normalizedZoom, 0, +1, 1, maxZoom, true);
  }

  private makeHoverPainter(item: StructureItem): TgdPainter | null {
    const { context, palette } = this;
    if (!context || !palette) return null;

    const segments = new TgdPainterSegmentsData();
    const uv: ArrayNumber2 = [
      (StructureItemType.Selected + 0.5) / (StructureItemType.Unknown + 1),
      0,
    ];
    const radius = item.radius * 1.2;
    segments.add([...item.start, radius], [...item.end, radius], uv, uv);

    return new TgdPainterSegments(context, {
      roundness: 32,
      minRadius: 1.5,
      makeDataset: segments.makeDataset,
      material: new TgdMaterialDiffuse({
        color: [0.3, 0.4, 0.5, 1],
        specularExponent: 1,
        specularIntensity: 0.25,
        lockLightsToCamera: true,
        light: new TgdLight({
          direction: new TgdVec3(0, 0, -1),
        }),
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
    return () => {
      const context = refPainter.current;
      if (!context) return;

      context.delete();
    };
  }, []);
  return refPainter.current;
}
