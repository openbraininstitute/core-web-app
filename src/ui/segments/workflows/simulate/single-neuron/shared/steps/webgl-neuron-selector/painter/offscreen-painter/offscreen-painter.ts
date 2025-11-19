/* eslint-disable no-bitwise */
import {
  TgdCameraPerspective,
  TgdContext,
  TgdPainterClear,
  TgdPainterGroup,
  TgdPainterSegments,
  TgdPainterState,
  webglPresetDepth,
} from '@tolokoban/tgd';
import { Structure, StructureItem } from '../structure';
import { makeSegments } from '../segments';
import { MaterialIndex } from './material-index';

export class OffscreenPainter {
  private readonly offscreenCanvas = new OffscreenCanvas(1, 1);

  private readonly offscreenContext: TgdContext;

  private _structure: Structure | null = null;

  private readonly group = new TgdPainterGroup();

  constructor(private readonly onscreenContext: TgdContext) {
    onscreenContext.eventPaint.addListener(this.paint);
    const context = new TgdContext(this.offscreenCanvas, {
      preserveDrawingBuffer: true,
      antialias: false,
      alpha: false,
    });
    context.camera = new TgdCameraPerspective();
    context.camera.near = onscreenContext.camera.near;
    context.camera.far = onscreenContext.camera.far;
    context.camera.fromTransfo(onscreenContext.camera.transfo);
    this.offscreenContext = context;
    context.add(this.group);
    this.paint();
  }

  get structure() {
    return this._structure;
  }

  set structure(value: Structure | null) {
    if (value === this._structure) return;

    this._structure = value;
    this.group.delete();
    if (value) {
      const segments = makeSegments(value);
      const context = this.offscreenContext;
      this.group.add(
        new TgdPainterClear(context, { color: [0, 0, 0, 1], depth: 1 }),
        new TgdPainterState(context, {
          depth: webglPresetDepth.lessOrEqual,
          children: [
            new TgdPainterSegments(context, {
              roundness: 3,
              minRadius: 4,
              makeDataset: segments.makeDataset,
              material: new MaterialIndex(),
            }),
          ],
        })
      );
    }
  }

  getItemAt(xScreen: number, yScreen: number): StructureItem | null {
    const { structure, offscreenContext: context } = this;
    if (!structure) return null;
    const data = new Uint8Array(context.width * context.height * 4);
    context.gl.readPixels(
      0,
      0,
      context.width,
      context.height,
      context.gl.RGBA,
      context.gl.UNSIGNED_BYTE,
      data
    );
    const [R, G, B] = context.readPixel(xScreen, yScreen);
    const value = (R + (G << 8) + (B << 16)) / 0xffffff;
    const index = Math.floor((structure.length + 2) * value) - 1;
    if (index < 0 || index > structure.length - 1) return null;

    return structure.get(index);
  }

  private readonly paint = () => {
    const { canvas } = this.onscreenContext;
    const w = Math.ceil(canvas.width / 2);
    const h = Math.ceil(canvas.height / 2);
    this.offscreenCanvas.width = w;
    this.offscreenCanvas.height = h;
    this.offscreenContext.camera.fromTransfo(this.onscreenContext.camera.transfo);
    this.offscreenContext.paint();
  };

  delete() {
    this.onscreenContext.eventPaint.removeListener(this.paint);
    this.offscreenContext.delete();
  }
}
