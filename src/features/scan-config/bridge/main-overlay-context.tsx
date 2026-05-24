'use client';

/**
 * full-screen overlay (currently used for model_identifier_multiple) for browse/search ui inside scan-config
 *
 * a field calls `openOverlay(content)` to show a picker. The template renders
 * that content above the normal 3-column layout
 */

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

type TScanConfigMainOverlayContext = {
  overlay: ReactNode | null;
  openOverlay: (content: ReactNode) => void;
  closeOverlay: () => void;
};

const ScanConfigMainOverlayContext = createContext<TScanConfigMainOverlayContext | null>(null);

// NOTE: this is a context to share the main overlay
// if the main area of the scan-config template needs to display a full-main-area
// component, it can use this context to display the component
// currently used for the model_identifier_multiple overlay
// but it can be used for any other full-main-area component
export function ScanConfigMainOverlayProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<ReactNode | null>(null);

  const closeOverlay = useCallback(() => {
    setOverlay(null);
  }, []);

  const openOverlay = useCallback((content: ReactNode) => {
    setOverlay(content);
  }, []);

  const value = useMemo(
    () => ({
      overlay,
      openOverlay,
      closeOverlay,
    }),
    [closeOverlay, openOverlay, overlay]
  );

  return (
    <ScanConfigMainOverlayContext.Provider value={value}>
      {children}
    </ScanConfigMainOverlayContext.Provider>
  );
}

export function useScanConfigMainOverlay() {
  const context = useContext(ScanConfigMainOverlayContext);
  if (!context) {
    throw new Error('useScanConfigMainOverlay must be used within ScanConfigMainOverlayProvider');
  }

  return context;
}

export function useScanConfigMainOverlayOptional() {
  return useContext(ScanConfigMainOverlayContext);
}
