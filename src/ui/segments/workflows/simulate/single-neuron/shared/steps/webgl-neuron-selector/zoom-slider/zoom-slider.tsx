/* eslint-disable no-param-reassign */
import React from 'react';
import { Slider } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';

import { PainterManager } from '../painter';

import { classNames } from '@/util/utils';

import styles from './zoom-slider.module.css';

export interface ZoomSliderProps {
  className?: string;
  painterManager: PainterManager;
}

// const formatter: NonNullable<SliderSingleProps['tooltip']>['formatter'] = (value) => `${Math.round(value * 100)}%`;

export default function ZoomSlider({ className, painterManager }: ZoomSliderProps) {
  const zoom = painterManager.eventZoom.useValue(painterManager.zoom);
  const handleZoomOut = () => {
    painterManager.zoom = Math.max(-1, zoom - 0.1);
  };
  const handleZoomIn = () => {
    painterManager.zoom = Math.min(+1, zoom + 0.1);
  };

  return (
    <div className={classNames(className, styles.zoomSlider)}>
      <button type="button" onClick={handleZoomOut}>
        <ZoomOutOutlined />
      </button>
      <Slider
        value={painterManager.zoom}
        onChange={(value) => {
          painterManager.zoom = value;
        }}
        min={-1}
        max={1}
        step={0.1}
        tooltip={{ formatter: null }}
      />
      <button type="button" onClick={handleZoomIn}>
        <ZoomInOutlined />
      </button>
    </div>
  );
}
