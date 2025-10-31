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

  return (
    <div className={classNames(className, styles.zoomSlider)}>
      <button type="button" onClick={painterManager.zoomOut}>
        <ZoomOutOutlined />
      </button>
      <Slider
        value={zoom}
        onChange={(value) => {
          painterManager.zoom = value;
        }}
        min={-1}
        max={1}
        step={0.01}
        tooltip={{ formatter: null }}
      />
      <button type="button" onClick={painterManager.zoomIn}>
        <ZoomInOutlined />
      </button>
    </div>
  );
}
