import {
  type TgdContext,
  TgdLight,
  TgdMaterialDiffuse,
  TgdPainterClear,
  TgdPainterGroup,
  TgdPainterSegments,
  TgdPainterState,
  TgdTexture2D,
  TgdVec3,
  tgdCanvasCreatePalette,
  webglPresetDepth,
} from '@tolokoban/tgd';

import { makeSegments } from '../segments';
import { Structure, type StructureItem } from '../structure';
import { PALETTE } from './contants';
import { PainterHover as PainterHighlight } from './highlight';
import { PainterSynapses } from './synapses';

export class Painter extends TgdPainterGroup {
  private _structure = new Structure({});

  private readonly groupSegments = new TgdPainterGroup();

  private readonly groupSynapses = new TgdPainterGroup();

  private readonly groupHover = new TgdPainterGroup();

  private readonly palette: TgdTexture2D;

  private _synapses: Array<{ color: string; data: Float32Array }> | null = null;

  constructor(private readonly context: TgdContext) {
    super();
    this.palette = new TgdTexture2D(context).loadBitmap(tgdCanvasCreatePalette(PALETTE)).setParams({
      magFilter: 'NEAREST',
      minFilter: 'NEAREST',
    });
    this.add(
      new TgdPainterClear(context, { color: [0, 0, 0, 1], depth: 1 }),
      new TgdPainterState(context, {
        depth: webglPresetDepth.less,
        children: [this.groupSegments, this.groupSynapses, this.groupHover],
      })
    );
  }

  get synapsesEnabled() {
    return this.groupSynapses.active;
  }

  set synapsesEnabled(value: boolean) {
    this.groupSynapses.active = value;
    this.context.paint();
  }

  get synapses() {
    return this._synapses;
  }

  set synapses(synapses: Array<{ color: string; data: Float32Array }> | null) {
    this._synapses = synapses;
    const { context, groupSynapses } = this;
    groupSynapses.delete();
    if (synapses && synapses.length > 0) {
      groupSynapses.add(new PainterSynapses(context, synapses));
    }
    this.context.paint();
  }

  get structure() {
    return this._structure;
  }

  set structure(value: Structure) {
    const { context } = this;
    this._structure = value;
    const segments = makeSegments(value);
    this.groupSegments.delete();
    this.groupSegments.add(
      new TgdPainterSegments(context, {
        roundness: 6,
        minRadius: 0.5,
        makeDataset: segments.makeDataset,
        material: new TgdMaterialDiffuse({
          color: this.palette,
          specularExponent: 1,
          specularIntensity: 0.25,
          lockLightsToCamera: true,
          light: new TgdLight({
            direction: new TgdVec3(0, 0, -1),
          }),
        }),
      })
    );
    context.paint();
  }

  highlight(item: StructureItem | null) {
    const { groupHover, context } = this;
    groupHover.delete();
    if (item) {
      groupHover.add(new PainterHighlight(context, item));
    }
    context.paint();
  }

  delete() {
    this.palette.delete();
    this.groupHover.delete();
    this.groupSegments.delete();
    this.groupSynapses.delete();
  }
}
