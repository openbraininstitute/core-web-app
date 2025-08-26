/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';

import { usePanelWidth } from '../hooks';
import { usePointerHandler } from './pointer-handler';

import { classNames } from '@/util/utils';

import styles from './panel-splitter.module.css';

interface PanelSplitterProps {
  className?: string;
}

export default function PanelSplitter({ className }: PanelSplitterProps) {
  const [panelWidth, setPanelWidth] = usePanelWidth();
  const handler = usePointerHandler();
  React.useEffect(() => {
    handler.panelWidth = panelWidth;
  }, [panelWidth, handler]);
  React.useEffect(() => {
    handler.eventPanelWidthChange.addListener(setPanelWidth);
    return () => handler.eventPanelWidthChange.removeListener(setPanelWidth);
  }, [setPanelWidth, handler]);

  return (
    <div
      className={classNames(
        className,
        styles.panelSplitter,
        panelWidth >= 100 && styles.fullscreen
      )}
      {...handler.props}
    >
      <div />
    </div>
  );
}
