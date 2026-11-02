import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import {
  bodyPreview,
  legMeshPoses,
  standingAngles,
} from '@/features/scan-config/components/model-preview/neuromechfly/kinematics';
import {
  applyNeuroMechFlyOverlayTransform,
  arenaColors,
  arenaMeshes,
  arenaOverlays,
  bodyMeshes,
  FORCES_KEY,
  flyMatrices,
  forceOverlays,
  highlightedOverlay,
  isEmbodied,
  isNeuroMechFlyConfig,
  LEG_OVERRIDES_KEY,
  overlayIds,
  previewTracks,
  readArena,
  readPerturbations,
} from '@/features/scan-config/components/model-preview/neuromechfly/scene';
import {
  forceArrowMeshes,
  replayArena,
  replayPath,
  replayPathMeshes,
  replayReadout,
  replayTracks,
  takenLegMeshes,
  useBodyReplay,
} from '@/features/scan-config/components/model-preview/neuromechfly/replay';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { resolveCircuitAssetPath } from '@/utils/circuit-manifest';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IBodyPreviewControls } from '@/features/scan-config/components/circuit-viz/body-preview-controls';
import type { IBodyKinematics } from '@/features/scan-config/components/model-preview/neuromechfly/kinematics';
import type { IBodyReplay } from '@/features/scan-config/components/model-preview/neuromechfly/replay';
import type {
  IBodyAssets,
  IBodyInterface,
  TBodySegments,
} from '@/features/scan-config/components/model-preview/neuromechfly/scene';
import type { Config } from '@/features/scan-config/types';
import type {
  MorphoViewerOverlayTransformEvent,
  MorphoViewerSignals,
  MorphoViewerWorldMesh,
} from '@/morpho-viewer';

/**
 * NeuroMechFly's body (flygym 1.2.1) standing: the trunk, every leg segment and the kinematics
 * that pose them, and the segments a force can push (minnick2026/viewer).
 */
const BODY_URL = '/static/neuromechfly';

/** Long enough for the viewer to have taken the toggled meshes before it frames them. */
const RESET_AFTER_TOGGLE_MS = 60;
/** What a block's preview shows around its window, and the longest window it shows. */
const LEAD_MS = 300;
const TAIL_MS = 400;
const LONGEST_WINDOW_MS = 2500;
/** The longest stretch of the episode "play all" shows. */
const LONGEST_PREVIEW_MS = 10_000;
/** How far the body reaches from its centre of mass, legs included (mm): what a frame keeps in. */
const BODY_REACH_MM = 3;

const MODE_READOUTS: Record<string, string> = {
  hold:
    'frozen as it is when the window opens. The previewed fly stands still, so nothing changes; ' +
    'in the simulation it is held there against its muscles, as by hand',
  lift: 'raised clear of the floor (femur up 69°)',
  limp: 'muscles cut, drawn hanging: in the simulation only the passive springs of its joints hold it',
  swing: 'held, with one joint swung back and forth as a sine',
};

/** The circuit's body interface (`components.body_interface_file`), or null without one. */
function useBodyInterface(circuit: ICircuit | undefined): IBodyInterface | null {
  const context = useWorkspace();
  const { config } = useCircuitConfig(circuit);
  const path = config?.raw.components?.body_interface_file;
  const { data } = useQuery({
    queryKey: ['circuit-body-interface', circuit?.id, config?.circuitAssetId, path],
    enabled: Boolean(circuit && config && path),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!circuit || !config || !path) throw new Error('Missing circuit or body interface');
      const response = await downloadAsset({
        ctx: context,
        entityType: EntityTypeDict.Circuit,
        entityId: circuit.id,
        id: config.circuitAssetId,
        assetPath: resolveCircuitAssetPath(path, config.raw.manifest),
        asRawResponse: true,
      });
      return (await response.json()) as IBodyInterface;
    },
  });
  return data ?? null;
}

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load ${url} (${response.status})`);
  return response;
}

function useBodyAssets(enabled: boolean): IBodyAssets | null {
  const { data } = useQuery({
    queryKey: ['neuromechfly-body'],
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [trunk, legs, kinematics, segments] = await Promise.all([
        fetchOk(`${BODY_URL}/body/trunk.glb`).then((r) => r.arrayBuffer()),
        fetchOk(`${BODY_URL}/body/legs.glb`).then((r) => r.arrayBuffer()),
        fetchOk(`${BODY_URL}/body_kinematics.json`).then(
          (r) => r.json() as Promise<IBodyKinematics>
        ),
        fetchOk(`${BODY_URL}/body_segments.json`).then((r) => r.json() as Promise<TBodySegments>),
      ]);
      return { trunk, legs, kinematics, segments };
    },
  });
  return data ?? null;
}

/**
 * An embodied circuit inside its NeuroMechFly body and, while a closed-loop simulation is being
 * configured, the arena it walks in, with handles that write back into the form, and a preview of
 * what the experiment's forces and leg overrides do to the body. Over a simulation's results, the
 * episode it ran, replayed with the spikes.
 *
 * The viewer's world is then the arena, in µm: the fly stands at the origin turned to the
 * start heading, and the somas are placed in its head and thorax by the circuit's body interface.
 */
export function useNeuroMechFlyScene({
  circuit,
  simulationId,
  ...scene
}: {
  /** Undefined turns the scene off: only large-circuit viewers draw it. */
  circuit: ICircuit | undefined;
  /** The simulation whose results are on show: its episode is replayed, if one was stored. */
  simulationId?: string;
} & Omit<IEmbodiedSceneOptions, 'bodyInterface' | 'replay'>) {
  const bodyInterface = useBodyInterface(circuit);
  const replay = useBodyReplay(isEmbodied(bodyInterface) ? simulationId : undefined);
  return useEmbodiedScene({ ...scene, bodyInterface, replay });
}

interface IEmbodiedSceneOptions {
  /** The circuit's body interface; null for a circuit with no body. */
  bodyInterface: IBodyInterface | null;
  config: Config | null | undefined;
  setConfig?: (updater: (previous: Config) => Config) => void;
  backgroundDark: boolean;
  selectedRootElement?: string;
  selectedEntry?: string;
  signals: MorphoViewerSignals;
  /**
   * An episode the body ran: the scene then shows its arena and plays everything the body did at
   * the spike replay's playhead.
   */
  replay?: IBodyReplay | null;
}

/** The scene of a circuit whose body interface is in hand (see {@link useNeuroMechFlyScene}). */
export function useEmbodiedScene({
  bodyInterface,
  config,
  setConfig,
  backgroundDark,
  selectedRootElement,
  selectedEntry,
  signals,
  replay,
}: IEmbodiedSceneOptions) {
  const embodied = isEmbodied(bodyInterface);
  const experiment = embodied && isNeuroMechFlyConfig(config);
  const replayed = embodied ? (replay ?? null) : null;
  const [showBody, setShowBody] = useState(true);
  const [showArena, setShowArena] = useState(true);
  /** What the preview plays: every perturbation, or the block the form has open. */
  const [previewing, setPreviewing] = useState<'all' | 'block' | null>(null);
  const assets = useBodyAssets(embodied);

  const arena = useMemo(() => {
    if (replayed) return replayArena(replayed);
    return experiment && config ? readArena(config) : null;
  }, [replayed, experiment, config]);
  const heading = arena?.heading ?? 0;
  const matrices = useMemo(
    () => (bodyInterface && embodied ? flyMatrices(bodyInterface, heading) : null),
    [bodyInterface, embodied, heading]
  );
  const arenaShown = Boolean(arena && showArena);
  const perturbations = useMemo(
    () => (experiment && config ? readPerturbations(config) : { forces: [], overrides: [] }),
    [experiment, config]
  );
  const segments = assets?.segments ?? null;
  const standingPoses = useMemo(
    () => (assets ? legMeshPoses(assets.kinematics, standingAngles(assets.kinematics)) : null),
    [assets]
  );

  // The body block the form has open, if it is one with something to play.
  const force = perturbations.forces.find(
    (candidate) => selectedRootElement === FORCES_KEY && candidate.name === selectedEntry
  );
  const override = perturbations.overrides.find(
    (candidate) => selectedRootElement === LEG_OVERRIDES_KEY && candidate.name === selectedEntry
  );
  const blockName = force?.name ?? override?.name;

  const preview = useMemo(() => {
    if (!assets || !segments || !arena) return null;
    if (previewing === 'block' && force) {
      const shown = Math.min(force.duration, LONGEST_WINDOW_MS);
      const played = bodyPreview(assets.kinematics, segments, {
        forces: [force],
        overrides: [],
        heading,
        from: force.start - LEAD_MS,
        to: force.start + shown + TAIL_MS,
      });
      // Pushed off its centre of mass, a free fly of 1 mg spins fast.
      let turn = '';
      if (played.turnDegrees >= 360) turn = `, spinning ${(played.turnDegrees / 360).toFixed(1)} turns`;
      else if (played.turnDegrees >= 1) turn = `, turning ${played.turnDegrees.toFixed(0)}°`;
      const readout = `${force.name}: a free fly moves ${played.displacementMm.toFixed(1)} mm${turn} in ${force.duration} ms.`;
      return { played, readout };
    }
    if (previewing === 'block' && override) {
      const shown = Math.min(override.duration, LONGEST_WINDOW_MS);
      const played = bodyPreview(assets.kinematics, segments, {
        forces: [],
        overrides: [override],
        heading,
        from: override.start - LEAD_MS,
        to: override.start + shown + TAIL_MS,
      });
      return {
        played,
        readout: `${override.name}: ${MODE_READOUTS[override.mode] ?? override.mode}.`,
      };
    }
    if (previewing === 'all') {
      const windows = [...perturbations.forces, ...perturbations.overrides];
      if (windows.length === 0) return null;
      const from = Math.max(0, Math.min(...windows.map((w) => w.start)) - LEAD_MS);
      const to = Math.min(
        Math.max(...windows.map((w) => w.start + w.duration)) + TAIL_MS,
        from + LONGEST_PREVIEW_MS
      );
      const played = bodyPreview(assets.kinematics, segments, {
        forces: perturbations.forces,
        overrides: perturbations.overrides,
        heading,
        from,
        to,
      });
      const pushes = perturbations.forces.length
        ? ` The pushes leave a free fly ${played.displacementMm.toFixed(1)} mm away.`
        : '';
      const span = `${(from / 1000).toFixed(1)}–${(to / 1000).toFixed(1)} s`;
      return { played, readout: `Every force and leg override, ${span} of the episode.${pushes}` };
    }
    return null;
  }, [assets, segments, arena, previewing, force, override, perturbations, heading]);

  const episode = useMemo(
    () =>
      replayed && assets && bodyInterface
        ? replayTracks(replayed, assets.kinematics, bodyInterface)
        : null,
    [replayed, assets, bodyInterface]
  );
  const tracks = useMemo(() => {
    if (episode) return episode;
    return preview && bodyInterface ? previewTracks(preview.played, heading, bodyInterface) : null;
  }, [episode, preview, bodyInterface, heading]);
  const meshAnimation = useMemo(() => {
    // An episode moves with the spikes: played, paused and seeked with them.
    if (episode && replayed) {
      return { frameMs: replayed.frame_ms, playing: false, spikeTimeStartMs: replayed.start_ms };
    }
    return preview && tracks
      ? { frameMs: preview.played.frameMs, playing: true, loop: true }
      : undefined;
  }, [episode, replayed, preview, tracks]);

  const meshes = useMemo(() => {
    if (!matrices) return undefined;

    const list: MorphoViewerWorldMesh[] =
      assets && standingPoses
        ? bodyMeshes({
            assets,
            heading,
            legPoses: standingPoses,
            overrides: perturbations.overrides,
            dark: backgroundDark,
            visible: showBody,
            tracks,
          })
        : [];
    if (arena && arenaShown) {
      // The floor reaches under wherever the fly walked.
      const walked = replayed ? replayPath(replayed) : [];
      list.push(...arenaMeshes(arena, arenaColors(backgroundDark), walked));
      if (replayed) list.push(...replayPathMeshes(replayed, backgroundDark));
    }
    if (episode && assets) {
      list.push(...forceArrowMeshes(episode, showBody));
      list.push(...takenLegMeshes(episode, assets.legs, backgroundDark, showBody));
    }
    const path = preview?.played.path ?? replayed?.frames.thorax;
    if (path?.length) {
      // Unseen, and framed: a reset while the body moves keeps the whole of its motion in view.
      const low = [0, 1, 2].map((axis) => Math.min(...path.map((p) => p[axis])) - BODY_REACH_MM);
      const high = [0, 1, 2].map((axis) => Math.max(...path.map((p) => p[axis])) + BODY_REACH_MM);
      list.push({
        id: 'neuromechfly:motion-extent',
        color: '#000000',
        opacity: 0,
        box: {
          center: low.map((v, axis) => ((v + high[axis]) / 2) * 1000) as [number, number, number],
          size: low.map((v, axis) => (high[axis] - v) * 1000) as [number, number, number],
        },
        fit: true,
      });
    }
    return list;
  }, [
    preview,
    replayed,
    episode,
    matrices,
    assets,
    standingPoses,
    heading,
    perturbations,
    backgroundDark,
    showBody,
    tracks,
    arena,
    arenaShown,
  ]);

  const overlays = useMemo(() => {
    if (!arena || !arenaShown) return [];

    const handles = arenaOverlays(arena, arenaColors(backgroundDark));
    if (replayed) {
      // An episode is there to watch: its sources, fixed in place.
      return handles
        .filter((group) => group.id.startsWith(overlayIds.source('')))
        .map((group) => ({ ...group, interactive: false }));
    }
    // While the fly moves in a preview, the handles that stand on it would be left behind.
    if (tracks) return handles.filter((group) => group.id !== overlayIds.heading);
    const pushes = segments ? forceOverlays(perturbations.forces, segments, heading) : [];
    return [...handles, ...pushes];
  }, [arena, arenaShown, backgroundDark, replayed, tracks, segments, perturbations, heading]);

  const onOverlayTransform = useCallback(
    (event: MorphoViewerOverlayTransformEvent) => {
      if (!setConfig || event.phase !== 'end') return;
      setConfig((previous) => applyNeuroMechFlyOverlayTransform(previous, event, segments));
    },
    [setConfig, segments]
  );

  // A toggle changes what the scene is, so the view is framed on what it now shows.
  const reframe = useCallback(() => {
    setTimeout(
      () => signals.cameraReset.dispatch(undefined).catch(() => {}),
      RESET_AFTER_TOGGLE_MS
    );
  }, [signals]);
  const onToggleBody = useCallback(
    (value: boolean) => {
      setShowBody(value);
      reframe();
    },
    [reframe]
  );
  const onToggleArena = useCallback(
    (value: boolean) => {
      setShowArena(value);
      reframe();
    },
    [reframe]
  );

  const hasPerturbations = perturbations.forces.length + perturbations.overrides.length > 0;
  // Starting or stopping a preview frames what then moves.
  const togglePreview = (kind: 'all' | 'block') => {
    setPreviewing((now) => (now === kind ? null : kind));
    reframe();
  };
  const bodyPreviewControls: IBodyPreviewControls | undefined =
    experiment && assets && hasPerturbations
      ? {
          all: {
            playing: previewing === 'all',
            onToggle: () => togglePreview('all'),
          },
          block: blockName
            ? {
                name: blockName,
                playing: previewing === 'block',
                onToggle: () => togglePreview('block'),
              }
            : undefined,
          readout: preview?.readout ?? null,
        }
      : undefined;

  return {
    /** The circuit has a body: the scene's world is the body's, or the arena's. */
    embodied,
    meshes,
    cellsMatrix: matrices?.cells,
    overlays,
    interactive: Boolean(setConfig && overlays.some((group) => group.interactive !== false)),
    onOverlayTransform,
    highlightedOverlayId: arenaShown
      ? highlightedOverlay(selectedRootElement, selectedEntry)
      : null,
    menu: embodied
      ? {
          showBody,
          onToggleBody,
          showArena: arena ? showArena : undefined,
          onToggleArena: arena ? onToggleArena : undefined,
        }
      : {},
    /** Plays the preview's tracks, on repeat, while one is on, or the episode's with the spikes. */
    meshAnimation,
    cellsTrack: tracks?.cells,
    /** With an arena on show, a fixed earth: the camera stays above its floor. */
    ground: arenaShown,
    bodyPreview: bodyPreviewControls,
    /** What the body did in the episode being replayed. */
    bodyReplay: replayed ? { readout: replayReadout(replayed) } : undefined,
  };
}
