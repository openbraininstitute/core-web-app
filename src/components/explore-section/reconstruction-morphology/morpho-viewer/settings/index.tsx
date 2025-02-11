import { useState } from 'react';
import { MorphologyCanvas } from '@bbp/morphoviewer';
// FIXME, why  this import ?
import { CloseIcon } from 'next/dist/client/components/react-dev-overlay/internal/icons/CloseIcon';

import ColorsLegend from '@/components/explore-section/reconstruction-morphology/morpho-viewer/settings/colors-legend';
import DendriteThickness from '@/components/explore-section/reconstruction-morphology/morpho-viewer/settings/dendrite-thickness';
import ThicknessMode from '@/components/explore-section/reconstruction-morphology/morpho-viewer/settings/thickness-mode';
import ColorMode from '@/components/explore-section/reconstruction-morphology/morpho-viewer/settings/color-mode';
import { classNames } from '@/util/utils';
import { SettingsIcon } from '@/components/icons';

import styles from './settings.module.css';

export interface SettingsProps {
  className?: string;
  painter: MorphologyCanvas;
}

export default function Settings({ className, painter }: SettingsProps) {
  const [expand, setExpand] = useState(false);
  return (
    <div className={classNames(styles.main, className, expand ? styles.expand : styles.collapse)}>
      <button type="button" onClick={() => setExpand(true)}>
        <SettingsIcon />
        <div>Settings</div>
      </button>
      <div>
        <div>
          <button type="button" onClick={() => setExpand(false)} aria-label="Close settings">
            <CloseIcon />
          </button>
        </div>
        <ColorsLegend className={styles.legend} painter={painter} />
        <DendriteThickness painter={painter} />
        <ThicknessMode painter={painter} />
        <ColorMode painter={painter} />
      </div>
    </div>
  );
}
