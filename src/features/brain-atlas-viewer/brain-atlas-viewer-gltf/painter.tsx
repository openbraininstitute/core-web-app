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
import { GenericEvent } from '@/util/generic-event';
import { logError } from '@/utils/logger';

import { type CameraController, setCamera } from './camera';
import { makeColor } from './hooks';
import { RegionMeshNotAvailableError } from './services/errors';
import { getCachedBrainRegionMeshArrayBuffer, getPointCouldData } from './services/services';

import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { SettingsValues } from './settings';
import type { VisibleRegion } from './types';

interface MeshBounds {
  min: [number, number, number];
  max: [number, number, number];
}

/**
 * The exact error `@tolokoban/tgd` throws when a painter/texture is built against
 * a TgdContext that has already been deleted — i.e. an async mesh/point-cloud load
 * that resolved after the canvas was torn down. Matching it lets us log such
 * failures without surfacing a user-facing popup. Kept in one place so the single
 * point of coupling to the framework's message lives here.
 */
function isDeletedContextError(ex: unknown): boolean {
  return ex instanceof Error && ex.message.includes('[TgdContext] This context has been deleted:');
}

/**
 * A region that exists in the hierarchy tree but has no 3D mesh in the current
 * atlas (e.g. non-volumetric grouping regions like "grooves"). This is expected
 * and benign, so we log it without surfacing a user-facing popup.
 */
function isMeshNotAvailableError(ex: unknown): boolean {
  return ex instanceof RegionMeshNotAvailableError;
}

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

  private contextVersion = 0;

  private pointCloudRequestVersion = 0;

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
    private readonly queryClient: QueryClient,
    private readonly backgroundColor = '#002766'
  ) {
    this.ID = globalId++;
    this.AtlasID = atlasId;
  }

  get isLoading() {
    return this._loadingMesh || this._loadingPointCloud;
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
    this.contextVersion += 1;
    this.pointCloudRequestVersion += 1;

    if (this.context) {
      this.context.delete();
      this.context = null;
    }

    this.cameraController = null;
    this.group = null;
    this.regionPainters.clear();
    this.pointCloudPainter = null;
    this.isAddingRegions = false;
    this.nextRegionsToAdd = null;
    this.pointCloudId = -1;
    this.hasFittedCamera = false;
    this.loadingMesh = false;
    this.loadingPointCloud = false;

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
          const minSizeInPixels = uniforms.minSizeInPixels?.value ?? 5;
          const radiusMultiplier = uniforms.radiusMultiplier?.value ?? 1;
          pointCloudPainter.shadowIntensity = shadowIntensity;
          pointCloudPainter.shadowThickness = shadowThickness;
          pointCloudPainter.specularExponent = specularExponent;
          pointCloudPainter.specularIntensity = specularIntensity;
          pointCloudPainter.light = light;
          pointCloudPainter.minSizeInPixels = minSizeInPixels;
          pointCloudPainter.radiusMultiplier = radiusMultiplier;
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

    // Snapshot the context generation so we can detect a teardown/remount
    // (start() deletes the context and bumps contextVersion) that happens while a
    // mesh load is in flight. Mirrors setPointCloud's contextVersion guard.
    const contextVersion = this.contextVersion;

    this.loadingMesh = true;
    this.isAddingRegions = true;
    this.nextRegionsToAdd = null;
    try {
      const shouldAutoFitCamera = !this.hasFittedCamera && this.AtlasID !== config.MOUSE_ATLAS__ID;
      let mergedBounds: MeshBounds | null = null;
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
            queryClient: this.queryClient,
          });
          // Context was torn down / replaced while fetching. Abort silently and do
          // NOT reset isAddingRegions/loadingMesh — a newer start()/setRegions owns
          // that state now, which the guard on the finally below preserves.
          if (contextVersion !== this.contextVersion) return;

          const meshBounds = await this.addMesh(data, region, contextVersion);
          // addMesh swallows its own errors and resolves null, so re-check here
          // before falling through to the cleanup tail.
          if (contextVersion !== this.contextVersion) return;

          if (shouldAutoFitCamera && meshBounds) {
            mergedBounds = this.mergeBounds(mergedBounds, meshBounds);
          }
        } catch (ex) {
          // A stale request must never surface a popup on whatever tab the user has
          // navigated to. Only genuine failures on the current context dispatch.
          if (contextVersion !== this.contextVersion) return;

          // The region simply has no mesh in this atlas (a selectable-but-non-volumetric
          // region, e.g. "grooves"). Expected and benign — log it, skip the popup, and
          // keep loading the remaining regions.
          if (isMeshNotAvailableError(ex)) {
            logError(`No 3D mesh available for region "${region.name}":`, ex);
            continue;
          }

          logError(`Unable to load mesh for region "${region.name}":`, ex);
          this.eventError.dispatch(
            <>
              <strong>{region.name}</strong>
              <p>An error occurred while attempting to visualize the brain region mesh.</p>
            </>
          );
        }
      }
      if (shouldAutoFitCamera && mergedBounds && this.cameraController) {
        // Framing is cosmetic: if it fails, the meshes are already in the scene,
        // so log and carry on rather than leaving the canvas hidden behind the
        // loading placeholder forever.
        try {
          this.cameraController.fitToBounds(mergedBounds.min, mergedBounds.max);
          this.hasFittedCamera = true;
        } catch (ex) {
          logError('Unable to fit the camera to the mesh bounds:', ex);
        }
      }
    } finally {
      // Only the current owner may clear these. On a stale context a newer
      // start()/setRegions has taken over and must keep them set (cf. the early
      // returns above and setPointCloud's guarded finally).
      if (contextVersion === this.contextVersion) {
        this.isAddingRegions = false;
        this.loadingMesh = false;
      }
    }
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
    const requestVersion = ++this.pointCloudRequestVersion;
    const contextVersion = this.contextVersion;

    // point cloud data is only available for the mouse atlas (legacy circuit)
    // for other species the coordinates live in a different space and would
    // appear misaligned with the mesh, so skip them entirely.
    if (this.AtlasID !== config.MOUSE_ATLAS__ID) {
      if (this.pointCloudPainter) {
        group.remove(this.pointCloudPainter);
        this.pointCloudPainter.delete();
        this.pointCloudPainter = null;
        this.pointCloudId = -1;
        context.paint();
      }
      return;
    }

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
        if (
          requestVersion !== this.pointCloudRequestVersion ||
          contextVersion !== this.contextVersion
        ) {
          return;
        }

        const currentContext = this.context;
        const currentGroup = this.group;
        if (!currentContext || !currentGroup || this.pointCloudId !== annotationValue) return;

        const painter = new TgdPainterPointsCloud(currentContext, {
          dataPoint,
          minSizeInPixels: 5,
          texture: new TgdTexture2D(currentContext).loadBitmap(tgdCanvasCreateFill(1, 1, color)),
        });
        currentGroup.add(painter);
        this.pointCloudPainter = painter;
      }
    } catch (ex) {
      if (
        requestVersion !== this.pointCloudRequestVersion ||
        contextVersion !== this.contextVersion
      ) {
        return;
      }

      if (isDeletedContextError(ex)) {
        logError(`Point cloud unavailable for annotation ${annotationValue}:`, ex);
        return;
      }
      // reset so the same region can be retried on next render
      this.pointCloudId = -1;
      // not all regions have point cloud data.
      // only log, never show a user-facing error for point cloud failures.
      logError(`Point cloud unavailable for annotation ${annotationValue}:`, ex);
      this.eventError.dispatch(`Unable to load points cloud!`);
    } finally {
      if (requestVersion === this.pointCloudRequestVersion) {
        this.loadingPointCloud = false;
      }
    }
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

  private async addMesh(data: ArrayBuffer | null, region: VisibleRegion, contextVersion: number) {
    const { context, group, regionPainters } = this;
    if (!context || !group || !data || regionPainters.has(region.id)) return null;
    try {
      const asset = await TgdDataGlb.parse(data);
      // start() ran during parse(): the captured `context` is now a deleted
      // TgdContext. Bail before touching it so we never throw
      // "[TgdContext] This context has been deleted:" (the popup's real cause).
      if (contextVersion !== this.contextVersion) return null;

      const geometry = new TgdGeometryGltf({ data: asset });
      const meshBounds = this.extractBoundsFromGltf(asset);
      const painterXRay = new TgdPainterXRay(context, {
        geometry,
        color: region.color,
        exponent: 2,
        intensity: 1,
      });
      group.add(painterXRay);
      regionPainters.set(region.id, painterXRay);
      context.paint();
      return meshBounds;
    } catch (ex) {
      // Defensive backup mirroring setPointCloud: if a stale/deleted context still
      // produced an error, only log it — never show the user-facing popup.
      if (contextVersion !== this.contextVersion || isDeletedContextError(ex)) {
        logError(`Unable to load mesh for region ${region.name} (stale context):`, ex);
        return null;
      }
      logError(`Unable to load mesh for region ${region.name}!`, ex);
      this.eventError.dispatch(`Unable to load mesh for region "${region.name}"!`);
      return null;
    }
  }

  /**
   * Extract the POSITION accessor's min/max from the GLTF JSON.
   */
  private extractBoundsFromGltf(asset: TgdDataGlb): MeshBounds | null {
    try {
      const json = asset.getJson();
      const accessors = json.accessors ?? [];
      // Find the POSITION accessor — it's the one with type "VEC3"
      // referenced by the first mesh primitive's POSITION attribute.
      const meshes = json.meshes ?? [];
      const firstMesh = meshes[0];
      if (!firstMesh) return null;

      const posAttr = firstMesh.primitives[0]?.attributes?.POSITION;
      if (typeof posAttr !== 'number') return null;

      const accessor = accessors[posAttr];
      if (!accessor?.min || !accessor?.max || accessor.min.length < 3 || accessor.max.length < 3) {
        return null;
      }

      return {
        min: [accessor.min[0], accessor.min[1], accessor.min[2]],
        max: [accessor.max[0], accessor.max[1], accessor.max[2]],
      };
    } catch {
      // Non-critical — fall back to default camera position
      return null;
    }
  }

  private mergeBounds(current: MeshBounds | null, next: MeshBounds): MeshBounds {
    if (!current) return next;

    return {
      min: [
        Math.min(current.min[0], next.min[0]),
        Math.min(current.min[1], next.min[1]),
        Math.min(current.min[2], next.min[2]),
      ],
      max: [
        Math.max(current.max[0], next.max[0]),
        Math.max(current.max[1], next.max[1]),
        Math.max(current.max[2], next.max[2]),
      ],
    };
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
