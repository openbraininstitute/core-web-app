/* eslint-disable no-param-reassign */

import {
  type ArrayNumber2,
  type TgdCameraState,
  TgdContext,
  TgdControllerCameraOrbit,
  TgdLight,
  TgdMat4,
  TgdMaterialDiffuse,
  type TgdPainter,
  TgdPainterSegments,
  TgdPainterSegmentsData,
  TgdVec3,
  tgdCalcMapRange,
} from '@tolokoban/tgd';
import React from 'react';
import { useAppNotification } from '@/components/notification';
import type { Morphology } from '@/services/bluenaas-single-cell/types';
import GenericEvent from '@/util/generic-event';
import { useVisibleSynapses } from '../hooks';
import { makeCamera } from './camera';
import { computeSectionOffset } from './math';
import { OffscreenPainter } from './offscreen-painter';
import { Painter } from './painters';
import { Structure, type StructureItem, StructureItemType } from './structure';

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

  private painter: Painter | null = null;

  private _disableSynapses = false;

  private _morphology: Morphology | null = null;

  private _canvas: HTMLCanvasElement | null = null;

  private context: TgdContext | null = null;

  private offscreen: OffscreenPainter | null = null;

  private structure: Structure | null = null;

  private _hoverItem: SelectedItem = { x: 0, y: 0, offset: 0, item: null };

  private initialPosition = new TgdVec3();

  private cameraController: TgdControllerCameraOrbit | null = null;

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

  get disableSynapses() {
    return this._disableSynapses;
  }

  set disableSynapses(value: boolean) {
    this._disableSynapses = value;
    const { painter } = this;
    if (painter) painter.synapsesEnabled = !value;
  }

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
    if (this._canvas === canvas) return;

    this._canvas = canvas;
    if (canvas) this.initialize();
    else this.delete();
  }

  get morphology() {
    return this._morphology;
  }

  set morphology(morphology: Morphology | null) {
    if (!morphology || JSON.stringify(this._morphology) !== JSON.stringify(morphology)) {
      this.lastCameraState = null;
    }
    this._morphology = morphology;
    if (!morphology) return;

    const structure = new Structure(morphology);
    this.structure = structure;
    const { offscreen, painter, context } = this;
    if (offscreen) offscreen.structure = structure;
    if (context && painter) {
      const { camera, zoomMin, zoomMax } = makeCamera(structure);
      context.camera = camera;
      this.initialPosition.from(context.camera.transfo.position);
      this.initCameraController(context, zoomMin, zoomMax);
      painter.structure = structure;
    }
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
    this.painter?.delete();
    this.painter = null;
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
    this.synapses = synapses;
    const { context, painter } = this;
    if (!context || !painter) return;

    painter.synapses = synapses;
  }

  private initialize() {
    const { canvas } = this;
    if (this.context || !canvas) return;

    const context = new TgdContext(canvas, {
      alpha: false,
      antialias: true,
    });
    this.painter = new Painter(context);
    context.add(this.painter);
    context.eventWebGLContextRestored.addListener(() => {
      this.delete();
      globalThis.requestAnimationFrame(() => this.initialize());
    });
    context.eventPaint.addListener(this.handlePaint);
    this.context = context;
    this.initOffscreen(context);
    this.eventHintVisible.dispatch(false);
    // Initialize painter.
    const { structure, painter } = this;
    painter.synapses = this.synapses;
    if (structure) {
      const { camera, zoomMin, zoomMax } = makeCamera(structure);
      context.camera = camera;
      this.initialPosition.from(context.camera.transfo.position);
      this.initCameraController(context, zoomMin, zoomMax);
      painter.structure = structure;
    }
    if (this.lastCameraState) {
      // Restore camera state
      context.camera.setCurrentState(this.lastCameraState);
      this.eventRestingPosition.dispatch(false);
    }
  }

  /**
   * We paint a thicker representation of the neuron in an offsceen canvas.
   * The color of each segment is the ID of this segment. So we must NOT
   * use anti-aliasing, or any shading (other than flat).
   */
  private initOffscreen(context: TgdContext) {
    this.offscreen = new OffscreenPainter(context);
    this.offscreen.structure = this.structure;
    context.inputs.pointer.eventHover.addListener((evt) => {
      const { painter, structure } = this;
      if (!painter || !structure) return;

      const { x, y } = evt.current;
      const item = this.offscreen?.getItemAt(x, y) ?? null;
      if (item !== this.hoverItem.item) {
        painter.highlight(null);
        let offset = 0;
        if (item) {
          painter.highlight(item);
          offset = computeSectionOffset(structure, item, context.camera, x, y);
        } else {
          painter.highlight(null);
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

      const { structure } = this;
      if (!this.context || !structure) return;

      const { x, y } = evt;
      const item = this.offscreen?.getItemAt(x, y) ?? null;
      if (item) {
        const segment = computeSectionOffset(structure, item, this.context.camera, x, y);
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
    if (this.cameraController) this.cameraController.detach();
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
    const { context } = this;
    if (!context) return null;

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

export function usePainterManager(morphology: Morphology) {
  const refPainter = React.useRef<PainterManager | null>(null);
  if (!refPainter.current) {
    refPainter.current = new PainterManager();
    refPainter.current.morphology = morphology;
  }

  // Update morphology when it changes (even if object reference changes)
  React.useEffect(() => {
    if (refPainter.current) {
      refPainter.current.morphology = morphology;
    }
  }, [morphology]);

  // Cleanup only on unmount
  React.useEffect(() => {
    return () => {
      const painterManager = refPainter.current;
      if (!painterManager) return;

      painterManager.delete();
    };
  }, []); // Empty dependency array - only run on mount/unmount
  return refPainter.current;
}

export function usePainterController(
  painter: PainterManager,
  disableElectrodes: boolean,
  disableSynapses: boolean,
  disableClick: boolean
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

  React.useEffect(() => {
    if (painter) {
      painter.clickable = disableClick !== true;
    }
  }, [disableClick, painter]);

  const synapses = useVisibleSynapses();
  React.useEffect(() => {
    painter.showSynapses(synapses);
  }, [synapses, painter]);

  React.useEffect(() => {
    painter.disableElectrodes = disableElectrodes;
  }, [disableElectrodes, painter]);

  React.useEffect(() => {
    painter.disableSynapses = disableSynapses;
  }, [disableSynapses, painter]);
}
