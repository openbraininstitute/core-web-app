import { useEffect, useState } from 'react';

import type { EmMeshViewer, ViewStatus } from '../engine/em-mesh-viewer';

export function useViewStatus(viewer: EmMeshViewer): ViewStatus | null {
  const [status, setStatus] = useState<ViewStatus | null>(null);
  useEffect(() => viewer.onStatus(setStatus), [viewer]);
  return status;
}
