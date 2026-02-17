import {
  type TgdCamera,
  TgdContext,
  TgdDataGlb,
  TgdGeometryGltf,
  TgdPainterClear,
  TgdPainterGroup,
  TgdPainterPointsCloud,
  TgdPainterState,
  TgdPainterXRay,
  TgdTexture2D,
  tgdCanvasCreateFill,
  webglPresetDepth,
} from '@tolokoban/tgd';

import { config } from '@/config';
import GenericEvent from '@/util/generic-event';
import { logError } from '@/util/logger';

import { type CameraController, setCamera } from './camera';
import { makeColor } from './hooks';
import { getCachedBrainRegionMeshArrayBuffer, getPointCouldData } from './services/services';

import type { ReactNode } from 'react';
import type { SettingsValues } from './settings';
import type { VisibleRegion } from './types';

let globalId = 1;
export class Painter {
  public readonly AtlasID: string;

  public readonly ID: number;

  public readonly eventError = new GenericEvent<ReactNode>();

  public readonly eventCameraChange = new GenericEvent<TgdCamera>();

  public readonly eventLoading = new GenericEvent<boolean>();

  public resetCamera: () => void = () => {};

  private cameraController: CameraController | null = null;

  private hasFittedCamera = false;

  private context: TgdContext | null = null;

  private group: TgdPainterGroup | null = null;

  private regionPainters = new Map<string, TgdPainterXRay>();

  private pointCloudPainter: TgdPainterPointsCloud | null = null;

  private pointCloudId = -1;

  private isAddingRegions = false;

  private nextRegionsToAdd: {
    regions: VisibleRegion[];
    accessToken: string;
  } | null = null;

  private _loadingMesh = false;

  private _loadingPointCloud = false;

  private _uniforms: SettingsValues = {};

  constructor(
    readonly atlasId: string,
    private readonly backgroundColor = '#002766'
  ) {
    this.ID = globalId++;
    this.AtlasID = atlasId;
  }

  get uniforms() {
    return this._uniforms;
  }

  set uniforms(value: SettingsValues) {
    this._uniforms = structuredClone(value);
    this.applyRegionsUniforms();
    this.context?.paint();
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
      const camCtrl = setCamera(context, this.eventCameraChange, this.AtlasID);
      this.cameraController = camCtrl;
      this.resetCamera = camCtrl.resetCamera;
      this.hasFittedCamera = false;
      const group = new TgdPainterGroup();
      this.group = group;
      context.add(
        new TgdPainterClear(context, {
          depth: 1,
          color: makeColor(this.backgroundColor),
        }),
        new TgdPainterState(context, {
          depth: webglPresetDepth.lessOrEqual,
          children: [group],
        })
      );
      context.logic.add(() => {
        const { pointCloudPainter, uniforms } = this;
        if (pointCloudPainter && uniforms) {
          const shadowIntensity = uniforms.shadowIntensity?.value ?? 0.5;
          const shadowThickness = uniforms.shadowThickness?.value ?? 1;
          const specularIntensity = uniforms.specularIntensity?.value ?? 0;
          const specularExponent = uniforms.specularExponent?.value ?? 10;
          const light = uniforms.light?.value ?? 1;
          pointCloudPainter.shadowIntensity = shadowIntensity;
          pointCloudPainter.shadowThickness = shadowThickness;
          pointCloudPainter.specularExponent = specularExponent;
          pointCloudPainter.specularIntensity = specularIntensity;
          pointCloudPainter.light = light;
        }
      });
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
        const data = await getCachedBrainRegionMeshArrayBuffer({
          atlasId: this.AtlasID,
          regionId: region.id,
        });
        await this.addMesh(data, region);
      } catch (ex) {
        logError(`Unable to load mesh for region "${region.name}":`, ex);
        this.eventError.dispatch(
          <>
            <strong>{region.name}</strong>
            <p>An error occurred while attempting to visualize the brain region mesh.</p>
          </>
        );
      }
    }
    this.isAddingRegions = false;
    this.loadingMesh = false;
    // Check if there is a waiting call.
    const nextRegionsToAdd = this.getNextRegionsToAdd();
    if (nextRegionsToAdd) {
      this.setRegions(nextRegionsToAdd.regions, nextRegionsToAdd.accessToken);
    } else {
      this.applyRegionsUniforms();
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
        this.pointCloudPainter = null;
      }
      this.pointCloudId = annotationValue;
      if (annotationValue !== -1) {
        const dataPoint = await getPointCouldData(annotationValue, accessToken);
        // context may have been destroyed while awaiting the fetch
        if (!this.context || !this.group) return;
        const painter = new TgdPainterPointsCloud(context, {
          dataPoint,
          minSizeInPixels: 5,
          texture: new TgdTexture2D(context).loadBitmap(tgdCanvasCreateFill(1, 1, color)),
        });
        group.add(painter);
        this.pointCloudPainter = painter;
      }
    } catch (ex) {
      if (
        ex instanceof Error &&
        ex.message.includes('[TgdContext] This context has been deleted:')
      ) {
        logError(`Point cloud unavailable for annotation ${annotationValue}:`, ex);
        return;
      }
      // reset so the same region can be retried on next render
      this.pointCloudId = -1;
      // not all regions have point cloud data.
      // only log, never show a user-facing error for point cloud failures.
      logError(`Point cloud unavailable for annotation ${annotationValue}:`, ex);
      this.eventError.dispatch(`Unable to load points cloud!`);
    }
    this.loadingPointCloud = false;
  }

  private getNextRegionsToAdd() {
    return this.nextRegionsToAdd;
  }

  /**
   * Apply uniforms for region meshes materials
   */
  private applyRegionsUniforms() {
    const { context } = this;
    if (!context) return;

    const { uniforms } = this;
    const exponent = uniforms.ghostExponent?.value ?? 2;
    const intensity = uniforms.ghostIntensity?.value ?? 1;
    for (const painter of this.regionPainters.values()) {
      painter.exponent = exponent;
      painter.intensity = intensity;
    }
    context.paint();
  }

  private async addMesh(data: ArrayBuffer | null, region: VisibleRegion) {
    const { context, group, regionPainters } = this;
    if (!context || !group || !data || regionPainters.has(region.id)) return;
    try {
      const asset = await TgdDataGlb.parse(data);
      const geometry = new TgdGeometryGltf({ data: asset });
      // Auto-fit camera to the first loaded mesh's bounding box (non-mouse atlases)
      if (
        !this.hasFittedCamera &&
        this.cameraController &&
        this.AtlasID !== config.MOUSE_ATLAS__ID
      ) {
        this.fitCameraFromGltf(asset);
      }
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

  /**
   * Extract the POSITION accessor's min/max from the GLTF JSON
   * and fit the camera to those bounds.
   */
  private fitCameraFromGltf(asset: TgdDataGlb) {
    try {
      const json = asset.getJson();
      const accessors = json.accessors ?? [];
      // Find the POSITION accessor — it's the one with type "VEC3"
      // referenced by the first mesh primitive's POSITION attribute.
      const meshes = json.meshes ?? [];
      const firstMesh = meshes[0];
      if (!firstMesh) return;

      const posAttr = firstMesh.primitives[0]?.attributes?.POSITION;
      if (typeof posAttr !== 'number') return;

      const accessor = accessors[posAttr];
      if (!accessor?.min || !accessor?.max) return;

      this.cameraController?.fitToBounds(accessor.min, accessor.max);
      this.hasFittedCamera = true;
    } catch {
      // Non-critical — fall back to default camera position
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
