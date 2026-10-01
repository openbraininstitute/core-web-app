import { RiCameraLine, RiEqualizerLine, RiResetLeftLine } from '@remixicon/react';

import { AxonIcon } from '@/components/icons/Axon';
import { RulerMeasure } from '@/components/icons/RulerMeasure';
import { SelectionBackground } from '@/components/icons/SelectionBackgroundThin';
import { TooltipIcon } from '@/components/icons/Tooltip';
import { ZoomInArea } from '@/components/icons/ZoomInArea';
import { DEFAULT_ELECTRODE_RADIUS } from '@/features/scan-config/components/color-by/use-viewer-config';

import {
  BackgroundToggle,
  ChromeMenu,
  MenuButton,
  MenuRow,
  MenuSlider,
  ViewerSwitch,
} from './chrome-menu';

export interface ViewerControlsMenuProps {
  /** capture a PNG of the circuit canvas (excludes gizmo, scalebar, chrome) */
  onCaptureImage: () => void;
  backgroundDark: boolean;
  onBackgroundDarkChange: (dark: boolean) => void;
  /** axons toggle — omit for viewers that have no axons (point cloud) */
  showAxons?: boolean;
  onToggleAxons?: (value: boolean) => void;
  /** neuron / soma opacity (0–1); omit to hide the control */
  neuronOpacity?: number;
  onNeuronOpacityChange?: (value: number) => void;
  /** multiplier on the soma radius; omit for viewers that draw morphologies */
  somaSizeScale?: number;
  onSomaSizeScaleChange?: (value: number) => void;
  /** electrode location overlays — omit when none are available */
  showElectrodes?: boolean;
  onToggleElectrodes?: (value: boolean) => void;
  /** electrode marker radius (world units); omit when electrodes unavailable */
  electrodeRadius?: number;
  onElectrodeRadiusChange?: (value: number) => void;
  /** morphology-location marker radius (world units); omit when picking is not active */
  morphologyLocationRadius?: number;
  onMorphologyLocationRadiusChange?: (value: number) => void;
  /** `Type[section]` tags beside each location; omit when picking is not active */
  showMorphologyLocationLabels?: boolean;
  onToggleMorphologyLocationLabels?: (value: boolean) => void;
  /** zoom slider over the canvas */
  showZoomSlider?: boolean;
  onToggleZoomSlider?: (value: boolean) => void;
  /** scalebar down the side of the canvas */
  showScalebar?: boolean;
  onToggleScalebar?: (value: boolean) => void;
  /** reset-config toggle is shown only when a saved config exists for this circuit */
  hasSavedConfig: boolean;
  onResetConfig: () => void;
  className?: string;
}

/**
 * settings popover matching the mockup's left menu. the trigger is a gear that
 * turns into a close (✕) icon while the menu is open; the menu opens to the
 * right of the trigger
 */
export function ViewerControlsMenu({
  onCaptureImage,
  backgroundDark,
  onBackgroundDarkChange,
  showAxons,
  onToggleAxons,
  neuronOpacity,
  onNeuronOpacityChange,
  somaSizeScale,
  onSomaSizeScaleChange,
  showElectrodes,
  onToggleElectrodes,
  electrodeRadius,
  morphologyLocationRadius,
  onMorphologyLocationRadiusChange,
  showMorphologyLocationLabels,
  onToggleMorphologyLocationLabels,
  showZoomSlider,
  onToggleZoomSlider,
  showScalebar,
  onToggleScalebar,
  onElectrodeRadiusChange,
  hasSavedConfig,
  onResetConfig,
  className,
}: ViewerControlsMenuProps) {
  return (
    <ChromeMenu
      label="Viewer settings"
      testId="viewer-settings"
      icon={<RiEqualizerLine className="size-4 shrink-0" />}
      className={className}
    >
      {(close) => (
        <>
          <MenuButton
            icon={<RiCameraLine className="size-4 shrink-0" />}
            label="Capture image"
            testId="viewer-capture-image"
            onClick={() => {
              close();
              onCaptureImage();
            }}
          />
          {onToggleAxons && (
            <MenuRow label="Axons" icon={<AxonIcon className="size-4 shrink-0" />}>
              <ViewerSwitch
                testId="viewer-toggle-axons"
                checked={!!showAxons}
                onChange={onToggleAxons}
              />
            </MenuRow>
          )}
          {onToggleElectrodes && (
            <MenuRow label="Electrodes" icon={<ElectrodesIcon className="size-4 shrink-0" />}>
              <ViewerSwitch
                testId="viewer-toggle-electrodes"
                checked={!!showElectrodes}
                onChange={onToggleElectrodes}
              />
            </MenuRow>
          )}
          {onElectrodeRadiusChange && electrodeRadius !== undefined && showElectrodes !== false && (
            <MenuSlider
              label="Electrode size"
              testId="viewer-slider-electrode-size"
              min={DEFAULT_ELECTRODE_RADIUS}
              max={80}
              step={5}
              value={electrodeRadius}
              onChange={onElectrodeRadiusChange}
            />
          )}
          {onToggleScalebar && (
            <MenuRow label="Scale bar" icon={<RulerMeasure className="size-4 shrink-0" />}>
              <ViewerSwitch
                testId="viewer-toggle-scale-bar"
                checked={!!showScalebar}
                onChange={onToggleScalebar}
              />
            </MenuRow>
          )}
          {onToggleZoomSlider && (
            <MenuRow label="Zoom slider" icon={<ZoomInArea className="size-4 shrink-0" />}>
              <ViewerSwitch
                testId="viewer-toggle-zoom-slider"
                checked={!!showZoomSlider}
                onChange={onToggleZoomSlider}
              />
            </MenuRow>
          )}
          {onToggleMorphologyLocationLabels && (
            <MenuRow label="Location labels" icon={<TooltipIcon className="size-4 shrink-0" />}>
              <ViewerSwitch
                testId="viewer-toggle-location-labels"
                checked={!!showMorphologyLocationLabels}
                onChange={onToggleMorphologyLocationLabels}
              />
            </MenuRow>
          )}
          {onMorphologyLocationRadiusChange && morphologyLocationRadius !== undefined && (
            <MenuSlider
              label="Location marker size"
              testId="viewer-slider-location-marker-size"
              min={1}
              max={30}
              step={1}
              value={morphologyLocationRadius}
              onChange={onMorphologyLocationRadiusChange}
            />
          )}
          {onNeuronOpacityChange && neuronOpacity !== undefined && (
            <MenuSlider
              label="Neuron opacity"
              testId="viewer-slider-neuron-opacity"
              min={5}
              max={100}
              step={5}
              value={Math.round(neuronOpacity * 100)}
              format={(percent) => `${percent}%`}
              onChange={(percent) => onNeuronOpacityChange(percent / 100)}
            />
          )}
          {onSomaSizeScaleChange && somaSizeScale !== undefined && (
            <MenuSlider
              label="Soma size"
              testId="viewer-slider-soma-size"
              min={0.2}
              max={2}
              step={0.1}
              value={somaSizeScale}
              format={(scale) => `${scale.toFixed(1)}×`}
              onChange={onSomaSizeScaleChange}
            />
          )}
          <MenuRow label="Background" icon={<SelectionBackground className="size-4 shrink-0" />}>
            <BackgroundToggle dark={backgroundDark} onChange={onBackgroundDarkChange} />
          </MenuRow>
          {hasSavedConfig && (
            <MenuButton
              icon={<RiResetLeftLine className="size-4 shrink-0" />}
              label="Reset saved view"
              onClick={onResetConfig}
            />
          )}
        </>
      )}
    </ChromeMenu>
  );
}

function ElectrodesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <title>Electrodes</title>
      <circle cx="4" cy="5" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="11" cy="11" r="1.5" />
    </svg>
  );
}
