import { StatusAlert, StatusPill } from '@/features/viewer-3d/chrome/status';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { MorphologyMeshState } from '../use-morphology-mesh';

/** The build under way, or why it failed. */
export function BuildStatus({ mesh, theme }: { mesh: MorphologyMeshState; theme: ViewerTheme }) {
  if (mesh.loadError) {
    return (
      <StatusAlert title="Could not read the morphology" message={mesh.loadError} theme={theme} />
    );
  }
  let text: string | null = null;
  if (mesh.buildError) text = `The surface could not be built: ${mesh.buildError}`;
  else if (!mesh.summary) text = 'Reading morphology…';
  else if (mesh.progress !== null) text = `Building mesh… ${Math.round(100 * mesh.progress)} %`;
  if (!text) return null;
  return <StatusPill text={text} failed={mesh.buildError !== null} theme={theme} />;
}
