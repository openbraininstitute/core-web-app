import { StatusAlert, StatusPill } from '@/features/viewer-3d/chrome/status';

import { DRACO_MAX_TRIANGLES } from '../engine/budget';
import { useSaveGlb } from '../save-glb';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { EmMeshLoad } from '../use-em-mesh';

const mb = (bytes: number) => (bytes / 1e6).toFixed(1);
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
  const { refused, error, fullReady, received, total } = load;
  const hasStandIn = load.meshes.standIn !== null;
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
        <ActionButton onClick={load.loadAnyway}>Load anyway</ActionButton>
      </StatusAlert>
    );
  }
  if (error && !hasStandIn) {
    return (
      <StatusAlert title="The mesh could not be loaded" message={error.message} theme={theme} />
    );
  }
  if (error) return <StatusPill text="Full detail could not be loaded" failed theme={theme} />;
  if (fullReady) return null;
  const downloading = total > 0 && received < total;
  let text: string;
  if (hasStandIn)
    text = downloading
      ? `Loading full detail… ${mb(received)} / ${mb(total)} MB`
      : 'Loading full detail…';
  else text = downloading ? `Downloading ${mb(received)} / ${mb(total)} MB` : 'Decoding…';
  return <StatusPill text={text} failed={false} theme={theme} />;
}

function ActionButton({
  onClick,
  disabled,
  children,
}: {
  onClick(): void;
  disabled?: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-current/30 px-3 py-1 text-xs font-medium transition-colors hover:bg-current/10 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/** Downloads the GLB, for a viewer elsewhere. */
function SaveButton({ load, name }: { load: EmMeshLoad; name: string }) {
  const { save, saving, error } = useSaveGlb(load.request, name);
  return (
    <ActionButton disabled={!load.request || saving} onClick={save}>
      {saving ? 'Downloading…' : error ? 'Download failed, try again' : 'Download the GLB'}
    </ActionButton>
  );
}
