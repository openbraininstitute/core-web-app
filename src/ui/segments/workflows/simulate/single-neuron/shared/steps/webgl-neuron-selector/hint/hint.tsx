import React from 'react';

import { PainterManager } from '../painter';
import { StructureItem, StructureItemType } from '../painter/structure';

import { classNames } from '@/util/utils';

import styles from './hint.module.css';

export interface HintProps {
  className?: string;
  painterManager: PainterManager;
}

export function HintPanel({ className, painterManager }: HintProps) {
  const hovered = painterManager.eventHover.useValue({ x: 0, y: 0, item: null, offset: 0 });
  const visible = painterManager.eventHintVisible.useValue(false);

  if (!visible || !hovered.item) {
    return null;
  }

  return (
    <div
      className={classNames(className, styles.hintPanel)}
      key="hint"
      style={hovered.y > 0 ? { bottom: '1em' } : { top: '4em' }}
    >
      <HintContent painterManager={painterManager} />
    </div>
  );
}

export function HintContent({ className, painterManager }: HintProps) {
  const hovered = painterManager.hoverItem;

  if (!hovered.item) {
    return null;
  }

  return (
    <div className={classNames(className, styles.hintContent)}>
      <div>Section:</div>
      <div>{resolveName(hovered.item)}</div>
      <div>Section index:</div>
      <div>{hovered.item.sectionIndex}</div>
      <div>Segment index:</div>
      <div>{hovered.item.segmentIndex}</div>
      <div>Number of segments:</div>
      <div>{hovered.item.segmentsCount}</div>
      <div>Offset:</div>
      <div>{hovered.offset.toFixed(3)}</div>
      <div>Distance from soma:</div>
      <div>{hovered.item.distanceFromSoma.toFixed(2)} µm</div>
    </div>
  );
}

function resolveName(item: StructureItem): React.ReactNode {
  switch (item.type) {
    case StructureItemType.Axon:
      return 'Axon';
    case StructureItemType.Soma:
      return 'Soma';
    case StructureItemType.Dendrite:
      return 'Dendrite';
    case StructureItemType.BasalDendrite:
      return 'Basal Dendrite';
    case StructureItemType.ApicalDendrite:
      return 'Apical dendrite';
    case StructureItemType.Myelin:
      return 'Myelin';
    default:
      return 'Unknown';
  }
}
