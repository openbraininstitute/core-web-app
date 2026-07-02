/**
 * ViewToggle — a small, unobtrusive toggle to switch between Display and JSON views.
 * Renders as a simple text link that flips state on click.
 */
import { RiCodeSSlashLine, RiListCheck } from '@remixicon/react';
import { useCallback } from 'react';

import { useViewMode } from './use-view-mode';

import styles from './tool-payload.module.css';

export type ViewMode = 'display' | 'raw';

export function ViewToggle() {
  const [mode, setMode] = useViewMode();

  const handleToggle = useCallback(() => {
    setMode(mode === 'display' ? 'raw' : 'display');
  }, [mode, setMode]);

  return (
    <button
      type="button"
      className={styles.viewToggle}
      onClick={handleToggle}
      aria-label={mode === 'display' ? 'Switch to JSON view' : 'Switch to Display view'}
    >
      {mode === 'display' ? (
        <>
          <RiCodeSSlashLine size={12} className={styles.viewToggleIcon} />
          <span>JSON</span>
        </>
      ) : (
        <>
          <RiListCheck size={12} className={styles.viewToggleIcon} />
          <span>Display</span>
        </>
      )}
    </button>
  );
}
