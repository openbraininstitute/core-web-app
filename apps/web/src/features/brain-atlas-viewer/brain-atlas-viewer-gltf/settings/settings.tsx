import React from 'react';

import { IconGear } from '@/features/ai-assistant/icons/gear';
import { Button } from '@/ui/molecules/button';
import { classNames } from '@/util/utils';

import { getAtlasViewerDefaultSettings } from '../hooks';
import Slider from './slider';

import styles from './settings.module.css';

export type SettingsValues = Record<
  string,
  {
    value: number;
  }
>;

export type SettingsDefinitions = Record<
  string,
  {
    value: number;
    label: string;
    min?: number;
    max?: number;
    step?: number;
  }
>;

export interface SettingsProps {
  className?: string;
  values: SettingsDefinitions;
  onChange(values: SettingsDefinitions): void;
}

export function Settings({ className, values, onChange }: SettingsProps) {
  const [show, setShow] = React.useState(false);
  const update = (key: string, value: number) => {
    onChange({
      ...values,
      [key]: {
        ...values[key],
        value,
      },
    });
  };
  const handleReset = () => {
    const defaultSettings = getAtlasViewerDefaultSettings();
    onChange(defaultSettings);
  };
  if (!globalThis.localStorage.getItem('debug:atlas-viewer')) return;

  return (
    <div className={classNames(className, styles.settings, show ? styles.show : styles.hide)}>
      <button type="button" onClick={() => setShow(!show)}>
        <IconGear />
      </button>
      <div
        className={classNames(
          styles.reset,
          show && areNewSettings(values) ? styles.show : styles.hide
        )}
      >
        <Button onClick={handleReset} rounded>
          <div>Reset</div>
        </Button>
      </div>
      <div>
        {Object.keys(values).map((key) => {
          const item = values[key];
          if (!item) return null;

          return (
            <Slider
              key={key}
              label={item.label}
              min={item.min ?? 0}
              max={item.max ?? 1}
              step={item.step ?? 0.01}
              value={item.value}
              onChange={(value) => update(key, value)}
            />
          );
        })}
      </div>
    </div>
  );
}

function areNewSettings(values: SettingsDefinitions): boolean {
  const defaultSettings = getAtlasViewerDefaultSettings();
  for (const key of Object.keys(defaultSettings)) {
    const value = values[key]?.value ?? 0;
    const defValue = defaultSettings[key].value;
    if (value !== defValue) return true;
  }
  return false;
}
