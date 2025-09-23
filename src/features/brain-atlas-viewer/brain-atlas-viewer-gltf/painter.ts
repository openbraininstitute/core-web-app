import {
  TgdCamera,
  tgdCanvasCreateFill,
  TgdContext,
  TgdDataGlb,
  TgdGeometryGltf,
  TgdPainter,
  TgdPainterClear,
  TgdPainterGroup,
  TgdPainterPointsCloud,
  TgdPainterState,
  TgdPainterXRay,
  TgdTexture2D,
  webglPresetDepth,
} from '@tolokoban/tgd';

import { setCamera } from './camera';
import { VisibleRegion } from './types';
import { getBrainRegionMeshArrayBuffer, getPointCouldData } from './services/services';
import { makeColor } from './hooks';
import { logError } from '@/util/logger';
import GenericEvent from '@/util/generic-event';

let globalId = 1;
export class Painter {
  public readonly ID: number;

  public readonly eventError = new GenericEvent<string>();

  public readonly eventCameraChange = new GenericEvent<TgdCamera>();

  public readonly eventLoading = new GenericEvent<boolean>();

  public resetCamera: () => void = () => {};

  private context: TgdContext | null = null;

  private group: TgdPainterGroup | null = null;

  private regionPainters = new Map<string, TgdPainter>();

  private pointCloudPainter: TgdPainter | null = null;

  private pointCloudId = -1;

  private isAddingRegions = false;

  private nextRegionsToAdd: { regions: VisibleRegion[]; accessToken: string } | null = null;

  private _loadingMesh = false;

  private _loadingPointCloud = false;

  constructor(private readonly backgroundColor = '#002766') {
    this.ID = globalId++;
  }

  public readonly start = (canvas: HTMLCanvasElement | null) => {
    if (this.context) {
      this.context.delete();
      this.context = null;
      this.isAddingRegions = false;
      this.nextRegionsToAdd = null;
      this.pointCloudId = -1;
    }

    if (canvas) {
      const context = new TgdContext(canvas, {
        antialias: true,
        depth: true,
        alpha: true,
        premultipliedAlpha: false,
      });
      this.context = context;
      this.resetCamera = setCamera(context, this.eventCameraChange);
      const group = new TgdPainterGroup();
      this.group = group;
      context.add(
        new TgdPainterClear(context, { depth: 1, color: makeColor(this.backgroundColor) }),
        new TgdPainterState(context, {
          depth: webglPresetDepth.lessOrEqual,
          children: [group],
        })
      );
      context.paint();
    }
  };

  public async setRegions(regions: VisibleRegion[], accessToken: string) {
    if (this.isAddingRegions) {
      this.nextRegionsToAdd = { regions, accessToken };
      return;
    }

    this.loadingMesh = true;
    this.isAddingRegions = true;
    this.nextRegionsToAdd = null;
    const regionsKeys = new Set(regions.map((region) => region.id));
    const keysToRemove: string[] = [];
    for (const key of this.regionPainters.keys()) {
      if (!regionsKeys.has(key)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      const painter = this.regionPainters.get(key);
      this.regionPainters.delete(key);
      if (!painter) continue;

      this.group?.remove(painter);
      this.context?.paint();
    }
    for (const region of regions) {
      try {
        const data = await getBrainRegionMeshArrayBuffer(accessToken, region.id);
        await this.addMesh(data, region);
      } catch (ex) {
        logError(`Unable to load mesh for region "${region.name}":`, ex);
        this.eventError.dispatch(`Unable to load mesh for region "${region.name}"!`);
      }
    }
    this.isAddingRegions = false;
    this.loadingMesh = false;
    // Check if there is a waiting call.
    const nextRegionsToAdd = this.getNextRegionsToAdd();
    if (nextRegionsToAdd) {
      this.setRegions(nextRegionsToAdd.regions, nextRegionsToAdd.accessToken);
    }
  }

  public async setPointCloud(annotationValue: number, color: string, accessToken: string) {
    const { context, group } = this;
    if (!context || !group || this.pointCloudId === annotationValue) return;

    this.loadingPointCloud = true;
    try {
      if (this.pointCloudPainter) {
        group.remove(this.pointCloudPainter);
        this.pointCloudPainter.delete();
      }
      this.pointCloudId = annotationValue;
      const dataPoint = await getPointCouldData(annotationValue, accessToken);
      const painter = new TgdPainterPointsCloud(context, {
        dataPoint,
        minSizeInPixels: 2,
        texture: new TgdTexture2D(context).loadBitmap(tgdCanvasCreateFill(1, 1, color)),
      });
      group.add(painter);
      this.pointCloudPainter = painter;
    } catch (ex) {
      logError('Unable to load point could!', ex);
      this.eventError.dispatch(`Unable to load points cloud!`);
    }
    this.loadingPointCloud = false;
  }

  private getNextRegionsToAdd() {
    return this.nextRegionsToAdd;
  }

  private async addMesh(data: ArrayBuffer | null, region: VisibleRegion) {
    const { context, group, regionPainters } = this;
    if (!context || !group || !data || regionPainters.has(region.id)) return;

    try {
      const asset = await TgdDataGlb.parse(data);
      const geometry = new TgdGeometryGltf({ data: asset });
      const painterXRay = new TgdPainterXRay(context, {
        geometry,
        color: region.color,
        exponent: 2,
        intensity: 1,
      });
      group.add(painterXRay);
      regionPainters.set(region.id, painterXRay);
      context.paint();
    } catch (ex) {
      logError(`Unable to load mesh for region ${region.name}!`, ex);
      this.eventError.dispatch(`Unable to load mesh for region "${region.name}"!`);
    }
  }

  private set loadingMesh(loading: boolean) {
    this._loadingMesh = loading;
    this.eventLoading.dispatch(this._loadingMesh || this._loadingPointCloud);
  }

  private set loadingPointCloud(loading: boolean) {
    this._loadingPointCloud = loading;
    this.eventLoading.dispatch(this._loadingMesh || this._loadingPointCloud);
  }
}
