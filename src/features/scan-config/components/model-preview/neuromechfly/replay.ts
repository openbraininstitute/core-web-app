import {
  LEG_BY_NAME,
  multiply,
  posed,
  recordedLegMeshPoses,
  rigidInverse,
} from '@/features/scan-config/components/model-preview/neuromechfly/kinematics';
import {
  ARROW_UM_PER_MICRONEWTON,
  cellsInBody,
  columnMajorOf,
  FORCE_COLOR,
  legOfMesh,
  NEUROMECHFLY_OVERLAY_PREFIX,
  UM_PER_MM,
} from '@/features/scan-config/components/model-preview/neuromechfly/scene';

import type {
  IBodyKinematics,
  TMatrix,
} from '@/features/scan-config/components/model-preview/neuromechfly/kinematics';
import type {
  IArena,
  IBodyInterface,
  IBodyTracks,
} from '@/features/scan-config/components/model-preview/neuromechfly/scene';
import type { MorphoViewerWorldMesh } from '@/morpho-viewer';

/** What a closed loop records for replaying its episode (obi-one `replay_document`). */
export interface IBodyReplay {
  version: number;
  /** Body ms from one frame to the next. */
  frame_ms: number;
  /** The spike time (ms) body time 0 is at: 0, unless the network ran on its own first. */
  start_ms: number;
  arena: {
    odour_sources: [number, number][];
    walls: [number, number, number, number][];
    capture_radius: number;
    start_heading: number;
  };
  forces: { segment: string; frame: string; force: number[]; start: number; duration: number }[];
  leg_overrides: { leg: string; mode: string; start: number; duration: number }[];
  /** Body ms each source was reached at. */
  sources_reached: { source: number; time_ms: number }[];
  summary: {
    episode_s?: number;
    path_length_mm?: number;
    overturned_s?: number | null;
    physics_fault?: boolean;
  };
  frames: {
    /** The thorax's position (mm) and orientation (w, x, y, z). */
    thorax: number[][];
    /** Every joint of every leg's chain (radians), in the order the body's kinematics list them. */
    joints: number[][];
    /** Each force: where it acts (mm) and how hard (µN), or null while it is off. */
    forces: (number[] | null)[][];
    overrides: boolean[][];
    upright: boolean[];
  };
}

/** The arena the episode ran in, as the scene draws an experiment's. */
export function replayArena(replay: IBodyReplay): IArena {
  const { arena } = replay;
  return {
    sources: arena.odour_sources.map(([x, y], index) => ({
      name: `Odour Source ${index + 1}`,
      x,
      y,
      swept: false,
    })),
    walls: arena.walls.map(([x0, y0, x1, y1], index) => ({
      name: `Wall ${index + 1}`,
      x0,
      y0,
      x1,
      y1,
      swept: false,
    })),
    heading: arena.start_heading,
    headingSwept: false,
    captureRadius: arena.capture_radius,
  };
}

/** Each force's arrow, frame by frame: its shaft, and the head at its tip. */
interface IArrowTracks {
  shaft: Float32Array;
  head: Float32Array;
}

export interface IReplayTracks extends IBodyTracks {
  forces: IArrowTracks[];
  /**
   * The meshes of each leg an override took, frame by frame while it held the leg; the leg's own
   * track hides it then, so the leg shows in the override's colour.
   */
  taken: Map<number, Float32Array>;
}

const SHAFT_WIDTH_UM = 90;
const HEAD_SIZE_UM = 280;
/** A force while it is off: shrunk to nothing. */
const HIDDEN: TMatrix = [1e-6, 0, 0, 0, 0, 1e-6, 0, 0, 0, 0, 1e-6, 0, 0, 0, 0, 1];
const UM: TMatrix = [UM_PER_MM, 0, 0, 0, 0, UM_PER_MM, 0, 0, 0, 0, UM_PER_MM, 0, 0, 0, 0, 1];

/** A unit box along +X, turned onto `direction` and scaled: `length` along it, `width` across. */
function along(origin: number[], direction: number[], length: number, width: number): TMatrix {
  const d = direction;
  const helper = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
  const u = [
    helper[1] * d[2] - helper[2] * d[1],
    helper[2] * d[0] - helper[0] * d[2],
    helper[0] * d[1] - helper[1] * d[0],
  ];
  const norm = Math.hypot(u[0], u[1], u[2]);
  const v = u.map((value) => value / norm);
  const w = [d[1] * v[2] - d[2] * v[1], d[2] * v[0] - d[0] * v[2], d[0] * v[1] - d[1] * v[0]];
  return [
    d[0] * length,
    v[0] * width,
    w[0] * width,
    origin[0],
    d[1] * length,
    v[1] * width,
    w[1] * width,
    origin[1],
    d[2] * length,
    v[2] * width,
    w[2] * width,
    origin[2],
    0,
    0,
    0,
    1,
  ];
}

/**
 * The episode as the viewer plays it: per frame, the trunk's and each leg mesh's transform, where
 * the somas stand, and each force's arrow, all column-major into the arena's µm.
 *
 * The trunk mesh is given standing at the origin, so each frame moves it by the thorax's motion
 * from that standing pose; the legs are posed through their chains from the recorded joints.
 */
export function replayTracks(
  replay: IBodyReplay,
  kinematics: IBodyKinematics,
  bodyInterface: IBodyInterface
): IReplayTracks {
  const { thorax, joints, forces } = replay.frames;
  const frames = thorax.length;
  const fromStanding = rigidInverse(posed(kinematics.thorax.pos, kinematics.thorax.quat));
  const placement = cellsInBody(bodyInterface);
  const trunk = new Float32Array(frames * 16);
  const cells = new Float32Array(frames * 16);
  const legs = new Map<number, Float32Array>();
  const arrows = replay.forces.map(() => ({
    shaft: new Float32Array(frames * 16),
    head: new Float32Array(frames * 16),
  }));
  const legOf = legOfMesh(kinematics);
  const overridden = replay.leg_overrides.map((override) => LEG_BY_NAME[override.leg]);
  const taken = new Map<number, Float32Array>();
  for (const mesh of legOf.keys()) {
    if (overridden.includes(legOf.get(mesh) as never))
      taken.set(mesh, new Float32Array(frames * 16));
  }
  const hidden = columnMajorOf(HIDDEN);
  for (let frame = 0; frame < frames; frame++) {
    const [x, y, z, ...quaternion] = thorax[frame];
    const thoraxPose = posed([x, y, z], quaternion);
    const body = multiply(UM, multiply(thoraxPose, fromStanding));
    trunk.set(columnMajorOf(body), frame * 16);
    cells.set(columnMajorOf(multiply(body, placement)), frame * 16);
    const held = new Set(overridden.filter((_, index) => replay.frames.overrides[frame]?.[index]));
    for (const [mesh, pose] of recordedLegMeshPoses(kinematics, thoraxPose, joints[frame])) {
      let track = legs.get(mesh);
      if (!track) {
        track = new Float32Array(frames * 16);
        legs.set(mesh, track);
      }
      const placed = columnMajorOf(multiply(UM, pose));
      const isHeld = held.has(legOf.get(mesh) as never);
      track.set(isHeld ? hidden : placed, frame * 16);
      taken.get(mesh)?.set(isHeld ? placed : hidden, frame * 16);
    }
    arrows.forEach((arrow, index) => {
      const acting = forces[frame]?.[index];
      const strength = acting ? Math.hypot(acting[3], acting[4], acting[5]) : 0;
      if (!acting || strength === 0) {
        arrow.shaft.set(columnMajorOf(HIDDEN), frame * 16);
        arrow.head.set(columnMajorOf(HIDDEN), frame * 16);
        return;
      }
      const anchor = acting.slice(0, 3).map((v) => v * UM_PER_MM);
      const direction = acting.slice(3, 6).map((v) => v / strength);
      const length = strength * ARROW_UM_PER_MICRONEWTON;
      const tip = anchor.map((v, axis) => v + direction[axis] * length);
      arrow.shaft.set(columnMajorOf(along(anchor, direction, length, SHAFT_WIDTH_UM)), frame * 16);
      arrow.head.set(columnMajorOf(along(tip, direction, HEAD_SIZE_UM, HEAD_SIZE_UM)), frame * 16);
    });
  }
  return { trunk, legs, cells, forces: arrows, taken };
}

/** The legs overrides took, in the override colour, shown only while each one held its leg. */
export function takenLegMeshes(
  tracks: IReplayTracks,
  legs: ArrayBuffer,
  dark: boolean,
  visible: boolean
): MorphoViewerWorldMesh[] {
  return [...tracks.taken].map(([mesh, track]) => ({
    id: `${NEUROMECHFLY_OVERLAY_PREFIX}replay:taken-leg:${mesh}`,
    glb: legs,
    meshIndex: mesh,
    color: dark ? '#f472b6' : '#be185d',
    opacity: 0.95,
    style: 'ghost' as const,
    matrix: columnMajorOf(HIDDEN),
    track,
    visible,
    clickFramesCells: true,
  }));
}

/** The arrows of the episode's forces, shown only while each one acts. */
export function forceArrowMeshes(tracks: IReplayTracks, visible: boolean): MorphoViewerWorldMesh[] {
  return tracks.forces.flatMap((arrow, index) => [
    {
      id: `${NEUROMECHFLY_OVERLAY_PREFIX}replay:force:${index}:shaft`,
      color: FORCE_COLOR,
      box: { center: [0.5, 0, 0], size: [1, 1, 1] },
      matrix: columnMajorOf(HIDDEN),
      track: arrow.shaft,
      visible,
    },
    {
      id: `${NEUROMECHFLY_OVERLAY_PREFIX}replay:force:${index}:head`,
      color: FORCE_COLOR,
      box: { center: [0, 0, 0], size: [1, 1, 1] },
      matrix: columnMajorOf(HIDDEN),
      track: arrow.head,
      visible,
    },
  ]);
}

/** Where the thorax went (x, y in mm), frame by frame. */
export function replayPath(replay: IBodyReplay): number[][] {
  return replay.frames.thorax.map(([x, y]) => [x, y]);
}

const PATH_SEGMENTS = 150;
const PATH_WIDTH_UM = 80;
const PATH_HEIGHT_UM = 8;

/**
 * The path the fly walked, as a line on the floor: meshes rather than overlay dots, so the body
 * hides it where it walks over it.
 */
export function replayPathMeshes(replay: IBodyReplay, dark: boolean): MorphoViewerWorldMesh[] {
  const path = replayPath(replay);
  const every = Math.max(1, Math.ceil(path.length / PATH_SEGMENTS));
  const points = path.filter((_, frame) => frame % every === 0 || frame === path.length - 1);
  const meshes: MorphoViewerWorldMesh[] = [];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1].map((v) => v * UM_PER_MM);
    const [x1, y1] = points[i].map((v) => v * UM_PER_MM);
    const length = Math.hypot(x1 - x0, y1 - y0);
    if (length === 0) continue;
    const [dx, dy] = [(x1 - x0) / length, (y1 - y0) / length];
    // Overlapping its neighbours by half a width, so the bends have no gaps.
    const reach = length + PATH_WIDTH_UM / 2;
    meshes.push({
      id: `${NEUROMECHFLY_OVERLAY_PREFIX}replay:path:${i}`,
      color: dark ? '#94a3b8' : '#64748b',
      box: { center: [0.5, 0, 0], size: [1, 1, 1] },
      matrix: columnMajorOf([
        dx * reach,
        -dy * PATH_WIDTH_UM,
        0,
        x0,
        dy * reach,
        dx * PATH_WIDTH_UM,
        0,
        y0,
        0,
        0,
        PATH_HEIGHT_UM,
        PATH_HEIGHT_UM,
        0,
        0,
        0,
        1,
      ]),
    });
  }
  return meshes;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** What happened to the body in the episode, said once, for beside the replay. */
export function replayReadout(replay: IBodyReplay): string {
  const seconds = (ms: number) => `${(ms / 1000).toFixed(2)} s`;
  const { summary } = replay;
  const parts: string[] = [];
  const reached = replay.sources_reached.map((source) => seconds(source.time_ms));
  const sources = replay.arena.odour_sources.length;
  if (reached.length === 0)
    parts.push(sources === 1 ? 'did not reach the source' : 'reached no source');
  else if (sources === 1) parts.push(`reached the source at ${reached[0]}`);
  else parts.push(`reached ${reached.length} of ${sources} sources, at ${reached.join(', ')}`);
  if (summary.path_length_mm !== undefined)
    parts.push(`walked ${summary.path_length_mm.toFixed(1)} mm`);
  if (summary.overturned_s) parts.push(`turned over at ${summary.overturned_s.toFixed(2)} s`);
  if (replay.forces.length) parts.push(plural(replay.forces.length, 'push', 'pushes'));
  if (replay.leg_overrides.length) {
    parts.push(plural(replay.leg_overrides.length, 'leg override', 'leg overrides'));
  }
  if (summary.physics_fault) parts.push('the physics broke down, ending the episode');
  const start =
    replay.start_ms > 0
      ? ` Its body starts ${seconds(replay.start_ms)} into the run, and the times here are counted from there.`
      : '';
  return `The fly ${parts.join(', ')}.${start}`;
}
