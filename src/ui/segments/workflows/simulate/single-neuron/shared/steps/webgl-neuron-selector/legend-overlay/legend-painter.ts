/* eslint-disable no-param-reassign */
import React from 'react';
import { tgdCalcMapRange, TgdVec4 } from '@tolokoban/tgd';

import { PainterManager } from '../painter';
import { getColor } from '../colors';

export interface LegendTarget {
  section: string;
  origin: 'injection' | 'recording';
  offset: number;
  record_currents: boolean;
  color?: string | undefined;
}

interface LabelToDraw {
  originX: number;
  originY: number;
  tipX: number;
  tipY: number;
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
  text: string;
  color: string;
}

const FONTSIZE = 16;
const MARGIN = 8;
const PADDING = 8;

export class LegendPainter {
  private canvas: HTMLCanvasElement | null = null;

  private ctx: CanvasRenderingContext2D | null = null;

  private targets: LegendTarget[] = [];

  constructor(private readonly painterManager: PainterManager) {
    painterManager.eventPaint.addListener(this.repaint);
  }

  private readonly repaint = () => {
    requestAnimationFrame(() => this.paint(this.canvas, this.targets));
  };

  paint(canvas: HTMLCanvasElement | null, targets: LegendTarget[]) {
    this.targets = targets;
    const ctx = this.getContext(canvas);
    if (!ctx || !canvas) return;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${FONTSIZE}px sans-serif`;
    const { painterManager } = this;
    const labels: LabelToDraw[] = [];
    for (const target of targets) {
      const segment = painterManager.getSegment(target.section, target.offset);
      if (!segment) continue;

      const tip = new TgdVec4(
        painterManager.getSectionCoordinates(target.section, target.offset),
        1
      ).applyMatrix(painterManager.getCameraMatrix());
      tip.scale(1 / tip.w);
      const measure = ctx.measureText(target.section);
      labels.push({
        originX: tip.x,
        originY: tip.y,
        text: target.section,
        color: getColor(segment.segmentIndex),
        tipX: round(tgdCalcMapRange(tip.x, -1, +1, 0, canvas.width)),
        tipY: round(tgdCalcMapRange(tip.y, +1, -1, 0, canvas.height)),
        boxX: 0,
        boxY: 0,
        boxW: round(PADDING * 2 + measure.width),
        boxH: round(PADDING * 2 + FONTSIZE),
      });
    }

    for (const label of spreadLabels(labels, canvas.width, canvas.height)) {
      drawLabel(ctx, label);
    }
  }

  private getContext(canvas: HTMLCanvasElement | null) {
    if (canvas !== this.canvas) {
      this.canvas = canvas;
      if (canvas) {
        this.ctx = canvas.getContext('2d');
        if (this.ctx) {
          this.ctx.font = `bold ${FONTSIZE}px sans-serif`;
        }
      }
    }
    return this.ctx;
  }
}

export function useLegendPainter(painterManager: PainterManager): LegendPainter {
  const ref = React.useRef<LegendPainter | null>(null);
  if (!ref.current) ref.current = new LegendPainter(painterManager);
  return ref.current;
}

function drawLabel(ctx: CanvasRenderingContext2D, label: LabelToDraw) {
  const r = 8;
  // Back is all black to help reading the lines.
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(label.tipX, label.tipY, r, r, 0, 0, 2 * Math.PI);
  ctx.stroke();
  if (label.boxX > 0) {
    ctx.font = `bold ${FONTSIZE}px sans-serif`;
    ctx.strokeRect(label.boxX, label.boxY, label.boxW, label.boxH);
  }
  ctx.beginPath();
  ctx.moveTo(label.tipX, label.tipY);
  ctx.lineTo(round(label.boxX + label.boxW / 2), round(label.boxY + label.boxH));
  ctx.stroke();
  // Front with colors.
  ctx.fillStyle = label.color;
  ctx.beginPath();
  ctx.ellipse(label.tipX, label.tipY, r, r, 0, 0, 2 * Math.PI);
  ctx.fill();
  if (label.boxX > 0) {
    ctx.font = `bold ${FONTSIZE}px sans-serif`;
    ctx.fillRect(label.boxX, label.boxY, label.boxW, label.boxH);
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = label.color;
  ctx.beginPath();
  ctx.moveTo(label.tipX, label.tipY);
  ctx.lineTo(round(label.boxX + label.boxW / 2), round(label.boxY + label.boxH));
  ctx.stroke();
  const measure = ctx.measureText(label.text);
  ctx.fillStyle = '#000';
  ctx.fillText(label.text, label.boxX + PADDING, label.boxY + PADDING + measure.emHeightAscent);
}

/**
 * To not have bluring on single pixels in Canvas 2D,
 * we must place elements at coordinates that are
 * integers + 0.5
 * @param value
 * @returns
 */
function round(value: number) {
  return Math.round(value) + 0.5;
}

/**
 * We split the labels in four categories: top-left, top-right, bottom-left and bottom-right.
 * And we distribute the labels to fill the space in each category.
 * @param labels
 * @param width
 * @param height
 */
function spreadLabels(labels: LabelToDraw[], width: number, height: number) {
  const topLeft: LabelToDraw[] = [];
  const topRight: LabelToDraw[] = [];
  const bottomLeft: LabelToDraw[] = [];
  const bottomRight: LabelToDraw[] = [];
  for (const label of labels) {
    if (label.originX < 0) {
      // Left
      if (label.originY < 0) bottomLeft.push(label);
      else topLeft.push(label);
    } else {
      // Right
      // eslint-disable-next-line no-lonely-if
      if (label.originY < 0) bottomRight.push(label);
      else topRight.push(label);
    }
  }
  const sorter = ({ originY: a }: LabelToDraw, { originY: b }: LabelToDraw) => b - a;
  topLeft.sort(sorter);
  bottomLeft.sort(sorter);
  topRight.sort(sorter);
  bottomRight.sort(sorter);

  const halfH = height / 2;
  let index = 0;
  let space = (halfH - MARGIN) / topLeft.length;
  for (const label of topLeft) {
    label.boxX = MARGIN;
    label.boxY = round((index + 0.5) * space);
    index++;
  }
  index = 0;
  space = (halfH - MARGIN) / bottomLeft.length;
  for (const label of bottomLeft) {
    label.boxX = MARGIN;
    label.boxY = round(halfH + (index + 0.5) * space);
    index++;
  }
  index = 0;
  space = (halfH - MARGIN) / topRight.length;
  for (const label of topRight) {
    label.boxX = width - MARGIN - label.boxW;
    label.boxY = round((index + 0.5) * space);
    index++;
  }
  index = 0;
  space = (halfH - MARGIN) / bottomRight.length;
  for (const label of bottomRight) {
    label.boxX = width - MARGIN - label.boxW;
    label.boxY = round(halfH + (index + 0.5) * space);
    index++;
  }

  return [...topLeft, ...topRight, ...bottomLeft, ...bottomRight];
}
