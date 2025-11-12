import React from 'react';

import { PainterManager } from '../painter';

import { IconCenter } from '@/components/icons/Center';
import Tooltip from '@/components/tooltip';
import { classNames } from '@/util/utils';

import styles from './button-reset-camera.module.css';

export interface ButtonResetCameraProps {
  className?: string;
  painterManager: PainterManager;
}

export function ButtonResetCamera({ className, painterManager }: ButtonResetCameraProps) {
  const restPosition = painterManager.eventRestingPosition.useValue(false);

  return (
    <div className={classNames(className, styles.buttonResetCamera, restPosition && styles.hide)}>
      <Tooltip tooltip="Recenter the view" arrow="topLeft" foreColor="#fff" backColor="#05a">
        <button type="button" onClick={painterManager.resetCamera}>
          <IconCenter />
        </button>
      </Tooltip>
    </div>
  );
}
