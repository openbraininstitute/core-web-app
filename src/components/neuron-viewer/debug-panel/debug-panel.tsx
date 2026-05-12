import React from 'react';

import { classNames } from '@/util/utils';

import type { MorphoViewerSynapsesGroup } from '@/morpho-viewer';
import type { Morphology } from '@/services/bluenaas-single-cell/types';

import styles from './debug-panel.module.css';

export interface DebugPanelProps {
  className?: string;
  morphology: Morphology;
  synapses: MorphoViewerSynapsesGroup[] | undefined;
}

/**
 * Buttons to download the morphology and the synapses
 */
export function DebugPanel({ className, morphology, synapses }: DebugPanelProps) {
  const refDialog = React.useRef<HTMLDialogElement | null>(null);
  const handleOpen = () => {
    // biome-ignore lint/suspicious/noConsole: this is for the debug panel
    console.debug('Morphology:', morphology);
    // biome-ignore lint/suspicious/noConsole: this is for the debug panel
    console.debug('Synapses:', synapses);
    const dialog = refDialog.current;
    if (!dialog) return;

    dialog.showModal();
  };
  const debugMode = useDebugMode();
  if (!debugMode) return null;

  return (
    <div className={classNames(className, styles.debugPanel)}>
      <button type="button" onClick={handleOpen}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <title>bug</title>
          <path
            fill="currentColor"
            d="M14,12H10V10H14M14,16H10V14H14M20,8H17.19C16.74,7.22 16.12,6.55 15.37,6.04L17,4.41L15.59,3L13.42,5.17C12.96,5.06 12.5,5 12,5C11.5,5 11.04,5.06 10.59,5.17L8.41,3L7,4.41L8.62,6.04C7.88,6.55 7.26,7.22 6.81,8H4V10H6.09C6.04,10.33 6,10.66 6,11V12H4V14H6V15C6,15.34 6.04,15.67 6.09,16H4V18H6.81C7.85,19.79 9.78,21 12,21C14.22,21 16.15,19.79 17.19,18H20V16H17.91C17.96,15.67 18,15.34 18,15V14H20V12H18V11C18,10.66 17.96,10.33 17.91,10H20V8Z"
          />
        </svg>
      </button>
      <dialog ref={refDialog}>
        <header>
          <div>Press Escape to dismiss</div>
        </header>
        <textarea>{JSON.stringify(morphology, null, 2)}</textarea>
        <textarea>{JSON.stringify(synapses, null, 2)}</textarea>
      </dialog>
    </div>
  );
}

/**
 * The viewer is highlight sensitive to the data it receives.
 * By setting any non-empty value to local storage item "@bbp/morphoviewer:debug",
 * a debug button will appear and give you access to this data.
 */
function useDebugMode(): boolean {
  const [debugMode, setDebugMode] = React.useState(false);
  React.useEffect(() => {
    const item = globalThis.localStorage.getItem('@bbp/morphoviewer:debug');
    setDebugMode(!!item && item.length > 0);
  }, []);
  return debugMode;
}
