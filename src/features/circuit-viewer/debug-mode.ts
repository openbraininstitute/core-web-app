import { useEffect, useState } from 'react';

/** The key morphoviewer reads too, so one switch turns on the debug tools of both. */
const DEBUG_KEY = '@openbraininstitute/morphoviewer:debug';

/** Whether the circuit viewer's debug tools are switched on in this browser. */
export function isCircuitViewerDebugMode(): boolean {
  const item = globalThis.localStorage?.getItem(DEBUG_KEY);
  return !!item && item.length > 0;
}

export function useCircuitViewerDebugMode(): boolean {
  const [debugMode, setDebugMode] = useState(false);
  // Read in an effect rather than as the initial state: the flag lives in
  // `localStorage`, which the server render has no view of.
  useEffect(() => setDebugMode(isCircuitViewerDebugMode()), []);
  return debugMode;
}
