/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';

import { usePointerHandler } from './pointer-handler';

import { classNames } from '@/util/utils';

import styles from './panel-splitter.module.css';

interface PanelSplitterProps {
  className?: string;
}

export default function PanelSplitter({ className }: PanelSplitterProps) {
  const handler = usePointerHandler();
  return <div className={classNames(className, styles.panelSplitter)} {...handler.props} />;
}
