import {
  megabytes,
  StatusAction,
  StatusAlert,
  StatusPill,
} from '@/features/viewer-3d/chrome/status';

import { DRACO_MAX_TRIANGLES } from '../engine/budget';
import { useSaveGlb } from '../save-glb';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { EmMeshLoad } from '../use-em-mesh';

const gb = (bytes: number) => (bytes / 2 ** 30).toFixed(1);
const millions = (n: number) => (n / 1e6).toFixed(1);

/** The load under way, a mesh not loaded for its size, or why loading failed. */
export function LoadStatus({
  load,
  name,
  theme,
}: {
  load: EmMeshLoad;
  name: string;
  theme: ViewerTheme;
}) {
  const { refused, error, fullReady, received, total, stopped, context } = load;
  const hasStandIn = load.meshes.standIn !== null;
  if (context === 'gone') {
    return (
      <StatusAlert
        title="The graphics were reset"
        message="The browser has not given them back. Reload the page to view the mesh again."
        theme={theme}
      >
        <StatusAction onClick={() => window.location.reload()}>Reload the page</StatusAction>
      </StatusAlert>
    );
  }
  if (context === 'lost') {
    return <StatusPill text="The graphics were reset, restoring…" kind="busy" theme={theme} />;
  }
  if (stopped) {
    return (
      <StatusAlert
        title="Loading this mesh stopped the page last time"
        message={`The browser probably ran out of memory${hasStandIn ? ': this is the coarse copy kept from before' : ''}. Loading it again may stop the page again.`}
        theme={theme}
      >
        <StatusAction onClick={load.loadAgain}>Try again</StatusAction>
        <SaveButton load={load} name={name} />
      </StatusAlert>
    );
  }
  if (refused?.kind === 'too-large') {
    return (
      <StatusAlert
        title="Too large to view in the browser"
        message={`It has ${millions(refused.triangles)}M triangles; the browser can decode up to about ${Math.floor(DRACO_MAX_TRIANGLES / 1e6)}M.`}
        theme={theme}
      >
        <SaveButton load={load} name={name} />
      </StatusAlert>
    );
  }
  if (refused?.kind === 'over-budget') {
    return (
      <StatusAlert
        title="This mesh may be too large for this device"
        message={`Loading it takes about ${gb(refused.peakBytes)} GB of memory at its peak, more than the ${gb(refused.allowedBytes)} GB the viewer allows itself here. The page may stop responding.`}
        theme={theme}
      >
        <StatusAction onClick={load.loadAnyway}>Load anyway</StatusAction>
      </StatusAlert>
    );
  }
  if (error && !hasStandIn) {
    return <StatusAlert title="The mesh could not be loaded" message={error} theme={theme} />;
  }
  if (error)
    return <StatusPill text="Full detail could not be loaded" kind="warning" theme={theme} />;
  if (load.fullDropped) {
    return (
      <StatusPill
        text="Full detail was let go of after the graphics reset"
        kind="warning"
        theme={theme}
      >
        <StatusAction onClick={load.loadAgain}>Load it</StatusAction>
      </StatusPill>
    );
  }
  if (fullReady) return null;
  const downloading = total > 0 && received < total;
  let text: string;
  if (hasStandIn)
    text = downloading
      ? `Loading full detail… ${megabytes(received)} / ${megabytes(total)} MB`
      : 'Loading full detail…';
  else
    text = downloading
      ? `Downloading ${megabytes(received)} / ${megabytes(total)} MB`
      : 'Decoding…';
  return <StatusPill text={text} kind="busy" theme={theme} />;
}

/** Downloads the GLB, for a viewer elsewhere. */
function SaveButton({ load, name }: { load: EmMeshLoad; name: string }) {
  const { save, saving, error } = useSaveGlb(load.request, name);
  return (
    <StatusAction disabled={!load.request || saving} onClick={save}>
      {saving ? 'Downloading…' : error ? 'Download failed, try again' : 'Download the GLB'}
    </StatusAction>
  );
}
