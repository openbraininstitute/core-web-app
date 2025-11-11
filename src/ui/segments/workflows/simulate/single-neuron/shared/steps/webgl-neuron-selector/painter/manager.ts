/* eslint-disable no-param-reassign */
import React from 'react';
import {
  ArrayNumber2,
  tgdCalcMapRange,
  TgdCameraState,
  tgdCanvasCreateFill,
  tgdCanvasCreatePalette,
  TgdContext,
  TgdControllerCameraOrbit,
  TgdLight,
  TgdMat4,
  TgdMaterialDiffuse,
  TgdPainter,
  TgdPainterClear,
  TgdPainterGroup,
  TgdPainterPointsCloud,
  TgdPainterSegments,
  TgdPainterSegmentsData,
  TgdPainterState,
  TgdTexture2D,
  TgdVec3,
  webglPresetBlend,
  webglPresetDepth,
} from '@tolokoban/tgd';
import { useAtomValue } from 'jotai';

import { useVisibleSynapses } from '../hooks';
import { SimulationStatus, simulationStatusAtomFamily } from '../../../context';
import { computeSectionOffset } from './math';
import { makeSegments } from './segments';
import { makeCamera } from './camera';
import { Structure, StructureItem, StructureItemType } from './structure';
import { OffscreenPainter } from './offscreen-painter';

import { Morphology } from '@/services/bluenaas-single-cell/types';
import GenericEvent from '@/util/generic-event';
import { useAppNotification } from '@/components/notification';

const PALETTE: string[] = [];
PALETTE[StructureItemType.Axon] = '#07f';
PALETTE[StructureItemType.Dendrite] = '#F44';
PALETTE[StructureItemType.ApicalDendrite] = '#F8f';
PALETTE[StructureItemType.Myelin] = `#778`;
PALETTE[StructureItemType.Soma] = '#dde';
PALETTE[StructureItemType.Selected] = '#fc0';
PALETTE[StructureItemType.Unknown] = '#a6f';

interface SelectedItem {
  x: number;
  y: number;
  item: StructureItem | null;
  offset: number;
}
export class PainterManager {
  private static id = 0;

  public disableElectrodes = false;

  public readonly id = PainterManager.id++;

  public readonly eventPaint = new GenericEvent<void>();

  public readonly eventHover = new GenericEvent<SelectedItem>();

  public readonly eventTap = new GenericEvent<{
    x: number;
    y: number;
    item: StructureItem | null;
    offset: number;
  }>();

  /** Event for normalized zoom changes. */
  public readonly eventZoom = new GenericEvent<number>();

  public readonly eventRestingPosition = new GenericEvent<boolean>();

  public readonly eventHintVisible = new GenericEvent<boolean>();

  public readonly eventForbiddenClick = new GenericEvent();

  private _morphology: Morphology | null = null;

  private _canvas: HTMLCanvasElement | null = null;

  private context: TgdContext | null = null;

  private offscreen: OffscreenPainter | null = null;

  private structure: Structure | null = null;

  private palette: TgdTexture2D | null = null;

  private groupHover = new TgdPainterGroup();

  private hoverPainter: TgdPainter | null = null;

  private _hoverItem: SelectedItem = { x: 0, y: 0, offset: 0, item: null };

  private initialPosition = new TgdVec3();

  private cameraController: TgdControllerCameraOrbit | null = null;

  private groupSynapses = new TgdPainterGroup({
    name: `Synapses#${Math.round(1e9 * Math.random())}`,
  });

  private synapses: Array<{ color: string; data: Float32Array }> = [];

  /**
   * When is the last time the camera moved?
   * We use this to prevent a quick camera moved
   * from being interpreted as a click.
   * Because a click will bring a modal window to add
   * recording.
   */
  private lastCameraChangeTimestamp = 0;

  /**
   * Remember the camera position, so if we initialize with the
   * same morphology, we can restore camera state.
   */
  private lastCameraState: TgdCameraState | null = null;

  private _clickable = true;

  get clickable() {
    return this._clickable;
  }

  set clickable(value: boolean) {
    this._clickable = value;
    this.context?.paint();
  }

  get hoverItem() {
    return this._hoverItem;
  }

  set hoverItem(value: SelectedItem) {
    this._hoverItem = value;
    this.eventHover.dispatch(value);
  }

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
    console.log('🚀 [manager] canvas =', canvas); // @FIXME: Remove this line written on 2025-11-11 at 11:11
    if (this._canvas === canvas) return;

    this._canvas = canvas;
    this.initialize();
  }

  get morphology() {
    return this._morphology;
  }

  set morphology(morphology: Morphology | null) {
    console.log('🚀 [manager] morphology =', morphology); // @FIXME: Remove this line written on 2025-11-11 at 11:12
    if (!morphology || JSON.stringify(this._morphology) !== JSON.stringify(morphology)) {
      this.lastCameraState = null;
    }

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

  showSynapses(synapses: Array<{ color: string; data: Float32Array }>) {
    const { context, groupSynapses } = this;
    console.log('🚀 [manager] synapses, context =', synapses, context); // @FIXME: Remove this line written on 2025-11-11 at 11:08
    if (!context) return;

    this.synapses = synapses;
    groupSynapses.removeAll();
    for (const { color, data: dataPoint } of synapses) {
      const cloud = new TgdPainterPointsCloud(context, {
        name: `TgdPainterPointsCloud[${color}]`,
        dataPoint,
        minSizeInPixels: 4,
        radiusMultiplier: 5,
        texture: new TgdTexture2D(context).loadBitmap(tgdCanvasCreateFill(1, 1, color)),
        mustDeleteTexture: true,
      });
      groupSynapses.add(cloud);
    }
    context.paint();
  }

  private initialize() {
    const { canvas, morphology } = this;
    if (!canvas || !morphology) return;

    if (this.context) {
      this.context.eventPaint.removeListener(this.handlePaint);
      this.context.delete();
    }
    if (this.cameraController) this.cameraController.detach();
    this.groupSynapses.delete();
    const structure = new Structure(morphology);
    this.structure = structure;
    const context = new TgdContext(canvas, {
      alpha: false,
      antialias: true,
    });
    context.eventPaint.addListener(this.handlePaint);
    this.context = context;
    const { camera, zoomMin, zoomMax } = makeCamera(structure);
    context.camera = camera;
    this.initialPosition.from(context.camera.transfo.position);
    const palette = new TgdTexture2D(context)
      .loadBitmap(tgdCanvasCreatePalette(PALETTE))
      .setParams({
        magFilter: 'NEAREST',
        minFilter: 'NEAREST',
      });
    this.palette = palette;
    this.initTgdPainters(context, structure, palette);
    this.initCameraController(context, zoomMin, zoomMax);
    this.initOffscreen(context, structure);
    this.eventHintVisible.dispatch(false);
    this.showSynapses(this.synapses);
    if (this.lastCameraState) {
      // Restore camera state
      camera.setCurrentState(this.lastCameraState);
      this.eventRestingPosition.dispatch(false);
    }
  }

  private initOffscreen(context: TgdContext, structure: Structure) {
    this.offscreen = new OffscreenPainter(context, structure);
    context.inputs.pointer.eventHover.addListener((evt) => {
      const { groupHover } = this;
      const { x, y } = evt.current;
      const item = this.offscreen?.getItemAt(x, y) ?? null;
      if (item !== this.hoverItem.item) {
        if (this.hoverPainter) {
          groupHover.remove(this.hoverPainter);
          this.hoverPainter = null;
        }
        let offset = 0;
        if (item) {
          this.hoverPainter = this.makeHoverPainter(item);
          if (this.hoverPainter) {
            groupHover.add(this.hoverPainter);
            offset = computeSectionOffset(structure, item, context.camera, x, y);
          }
        }
        this.hoverItem = { x, y, offset, item: item ?? null };
        this.context?.paint();
        this.eventHintVisible.dispatch(true);
      }
    });
    context.inputs.pointer.eventTap.addListener((evt) => {
      if (this.disableElectrodes) return;

      if (!this.clickable) {
        this.eventForbiddenClick.dispatch();
        return;
      }

      // Prevent camera movement to be interpreted as a click.
      if (Date.now() - this.lastCameraChangeTimestamp < 300) return;

      if (!context) return;

      const { x, y } = evt;
      const item = this.offscreen?.getItemAt(x, y) ?? null;
      if (item) {
        const segment = computeSectionOffset(structure, item, context.camera, x, y);
        this.hoverItem = { x, y, offset: segment, item: item ?? null };
        this.eventTap.dispatch({
          x,
          y,
          item: this.hoverItem.item,
          offset: segment,
        });
        this.eventHintVisible.dispatch(false);
      }
    });
  }

  private initCameraController(context: TgdContext, minZoom: number, maxZoom: number) {
    const cameraController = new TgdControllerCameraOrbit(context, {
      inertiaOrbit: 500,
      inertiaZoom: 250,
      minZoom,
      maxZoom,
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
    this.groupSynapses = new TgdPainterGroup({
      name: `Synapses#${Math.round(1e9 * Math.random())}`,
    });
    context.add(
      new TgdPainterClear(context, { color: [0, 0, 0, 1], depth: 1 }),
      new TgdPainterState(context, {
        depth: webglPresetDepth.less,
        children: [
          new TgdPainterSegments(context, {
            roundness: 6,
            minRadius: 0.5,
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
          this.groupSynapses,
          groupHover,
        ],
      })
    );
    context.paint();
    this.groupHover = groupHover;
  }

  private readonly handlePaint = () => {
    const { context } = this;
    if (!context) return;

    this.lastCameraState = context.camera.getCurrentState();
    this.eventPaint.dispatch();
  };

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
    const radius = item.radius * 1.5;
    segments.add([...item.start, radius], [...item.end, radius], uv, uv);

    return new TgdPainterSegments(context, {
      roundness: 32,
      minRadius: 2,
      makeDataset: segments.makeDataset,
      material: new TgdMaterialDiffuse({
        color: [0.8, 0.6, 0.3, 1],
        specularExponent: 1,
        specularIntensity: 0.5,
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
  });
  return refPainter.current;
}

export function usePainterController(
  painter: PainterManager,
  sessionId: string,
  disableElectrodes: boolean,
  mode: 'build' | 'simulation'
) {
  const notif = useAppNotification();
  React.useEffect(() => {
    const action = () => {
      notif.error({
        message: `You cannot add recordings nor move injection while a simulation is running!`,
        key: `ForbidenClick[${painter.id}]`,
      });
    };
    painter.eventForbiddenClick.addListener(action);
    return () => painter.eventForbiddenClick.removeListener(action);
  }, [notif, painter]);

  const simulationStatus = useAtomValue(simulationStatusAtomFamily(sessionId));
  React.useEffect(() => {
    const s = simulationStatus?.status;
    if (painter) {
      painter.clickable = s !== SimulationStatus.LAUNCHED;
    }
  }, [simulationStatus, painter]);

  const synapses = useVisibleSynapses(sessionId, mode);
  React.useEffect(() => {
    painter.showSynapses(synapses);
  }, [synapses, painter]);

  React.useEffect(() => {
    painter.disableElectrodes = disableElectrodes;
  }, [disableElectrodes, painter]);
}
