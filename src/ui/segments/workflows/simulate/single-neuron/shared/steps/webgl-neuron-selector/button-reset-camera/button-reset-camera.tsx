import React from 'react';

import { IconCenter } from '@/components/icons/Center';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { classNames } from '@/util/utils';

import type { PainterManager } from '../painter';

import styles from './button-reset-camera.module.css';

export interface ButtonResetCameraProps {
  className?: string;
  painterManager: PainterManager;
}

export function ButtonResetCamera({ className, painterManager }: ButtonResetCameraProps) {
  const restPosition = painterManager.eventRestingPosition.useValue(false);

  return (
    <div className={classNames(className, styles.buttonResetCamera, restPosition && styles.hide)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={painterManager.resetCamera}>
            <IconCenter />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="bg-[#05a] text-white">
          Recenter the view
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
