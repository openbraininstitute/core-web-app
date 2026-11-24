import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { expect, test, vi } from 'vitest';

import { useSceneTablePane } from '@/features/circuit-viewer/scene-table-pane';
import CircuitViewer3d from '@/features/logbook/editor/blocks/viewer-3d/circuit';

vi.mock('@/api/entitycore/queries/model/circuit', () => ({
  getCircuit: () => Promise.resolve({ id: 'c-1', type: 'circuit', name: 'Circuit' }),
}));

// The scene as the real one takes the host's pane: it claims it, then draws its table there.
function SceneWithTable() {
  const pane = useSceneTablePane();
  const claim = pane?.claim;
  useEffect(() => claim?.(), [claim]);
  return (
    <>
      <p>3D scene</p>
      {pane?.target ? createPortal(<p>nodes table</p>, pane.target) : null}
    </>
  );
}
vi.mock('@/features/scan-config/components/model-preview', () => ({
  ModelPreview: SceneWithTable,
}));

test('a circuit opened in 3D lays its nodes table in a pane under the view, as the scan config does', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CircuitViewer3d entityId="c-1" project={{ virtualLabId: 'lab', projectId: 'proj' }} />
    </QueryClientProvider>
  );

  expect(await screen.findByText('3D scene')).toBeTruthy();
  expect(await screen.findByText('nodes table')).toBeTruthy();
});
