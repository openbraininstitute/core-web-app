/**
 * The NeuroMechFly body posed and pushed in the browser, without physics: for previewing what an
 * experiment's leg overrides and forces do, while it is being designed.
 *
 * - A leg an override takes moves to the joint targets the closed loop would set for it, through
 *   the body's own kinematic chains (minnick2026/viewer/export_kinematics.py); the others stand.
 * - A push moves the fly as a free body, from its mass and inertia, with no floor. On the floor its
 *   feet grip, and the same push moves it far less, so the preview says so beside the number.
 */

/** A 4x4 matrix, row-major. */
export type TMatrix = number[];

export const LEG_CODES = ['LF', 'LM', 'LH', 'RF', 'RM', 'RH'] as const;
export type TLeg = (typeof LEG_CODES)[number];

export const LEG_BY_NAME: Record<string, TLeg> = {
  left_front: 'LF',
  left_middle: 'LM',
  left_hind: 'LH',
  right_front: 'RF',
  right_middle: 'RM',
  right_hind: 'RH',
};

/** The actuated joints of a leg, in flygym's order (obi-one `body.LEG_JOINTS`). */
const LEG_JOINTS = ['coxa', 'coxa_roll', 'coxa_yaw', 'femur', 'femur_roll', 'tibia', 'tarsus'];
const FEMUR = LEG_JOINTS.indexOf('femur');
const TIBIA = LEG_JOINTS.indexOf('tibia');
/** As obi-one's `body.LIFT_FEMUR_RADIANS`. */
const LIFT_FEMUR_RADIANS = -1.2;
/**
 * A limp leg has no posture of its own without physics: drawn with its femur dropped and its tibia
 * let out, as it hangs.
 */
const LIMP_FEMUR_RADIANS = 0.5;
const LIMP_TIBIA_RADIANS = 0.6;

interface IJoint {
  axis: number[];
  pos: number[];
  ref: number;
  standing: number;
  /** Which actuated joint it is (index into LEG_JOINTS); null for a passive one. */
  actuated: number | null;
}

interface IBody {
  name: string;
  /** Index of the parent in the leg's chain, or -1 for the thorax. */
  parent: number;
  pos: number[];
  quat: number[];
  joints: IJoint[];
  geoms: { mesh: number; pos: number[]; quat: number[] }[];
}

export interface IBodyKinematics {
  /** g */
  mass: number;
  /** mm, standing at the origin facing +X */
  com: number[];
  /** g mm², about the centre of mass */
  inertia: number[][];
  thorax: { pos: number[]; quat: number[] };
  gait: { frequency: number; offsets: Record<TLeg, number> };
  legs: Record<TLeg, { bodies: IBody[]; neutral: number[]; steps: number[][] }>;
}

/** Seven actuated joint angles per leg. */
export type TAngles = Record<TLeg, number[]>;

const IDENTITY: TMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function multiply(a: TMatrix, b: TMatrix): TMatrix {
  const out = new Array<number>(16).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[r * 4 + k] * b[k * 4 + c];
      out[r * 4 + c] = sum;
    }
  }
  return out;
}

function rotation(r: number[][], t: number[] = [0, 0, 0]): TMatrix {
  return [...r[0], t[0], ...r[1], t[1], ...r[2], t[2], 0, 0, 0, 1];
}

function translation(t: number[]): TMatrix {
  return rotation(
    [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    t
  );
}

/** MuJoCo's convention: (w, x, y, z). */
function quaternionRotation([w, x, y, z]: number[]): number[][] {
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];
}

/** Rotation by `angle` about the unit vector `axis` (Rodrigues). */
function axisRotation(axis: number[], angle: number): number[][] {
  const [x, y, z] = axis;
  const length = Math.hypot(x, y, z) || 1;
  const [u, v, w] = [x / length, y / length, z / length];
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    [c + u * u * t, u * v * t - w * s, u * w * t + v * s],
    [v * u * t + w * s, c + v * v * t, v * w * t - u * s],
    [w * u * t - v * s, w * v * t + u * s, c + w * w * t],
  ];
}

/** A pose (mm) and an orientation (w, x, y, z) as a matrix. */
export function posed(pos: number[], quat: number[]): TMatrix {
  return rotation(quaternionRotation(quat), pos);
}

/** The inverse of a rigid motion: R^T, -R^T t. */
export function rigidInverse(m: TMatrix): TMatrix {
  const r = [0, 1, 2].map((row) => [0, 1, 2].map((column) => m[column * 4 + row]));
  const t = [m[3], m[7], m[11]];
  return rotation(
    r,
    r.map((row) => -(row[0] * t[0] + row[1] * t[1] + row[2] * t[2]))
  );
}

/** A hinge turned by `angle` about `axis` through `pos`, in its body's frame. */
function hinge(axis: number[], pos: number[], angle: number): TMatrix {
  return multiply(
    multiply(translation(pos), rotation(axisRotation(axis, angle))),
    translation(pos.map((v) => -v))
  );
}

/** The actuated joints as the body stands, before any step. */
export function standingAngles(kinematics: IBodyKinematics): TAngles {
  const angles = {} as TAngles;
  for (const leg of LEG_CODES) {
    angles[leg] = new Array<number>(LEG_JOINTS.length).fill(0);
    for (const body of kinematics.legs[leg].bodies) {
      for (const joint of body.joints) {
        if (joint.actuated !== null) angles[leg][joint.actuated] = joint.standing;
      }
    }
  }
  return angles;
}

/**
 * Where each leg mesh stands, by mesh index, with the thorax at `thorax` and each joint at the
 * angle `angle` gives it; `index` counts the joints down every leg's chain, legs in LEG_CODES order.
 */
function meshPoses(
  kinematics: IBodyKinematics,
  thorax: TMatrix,
  angle: (leg: TLeg, joint: IJoint, index: number) => number
): Map<number, TMatrix> {
  const poses = new Map<number, TMatrix>();
  let index = 0;
  for (const leg of LEG_CODES) {
    const chain: TMatrix[] = [];
    for (const body of kinematics.legs[leg].bodies) {
      let pose = multiply(body.parent === -1 ? thorax : chain[body.parent], posed(body.pos, body.quat));
      for (const joint of body.joints) {
        pose = multiply(pose, hinge(joint.axis, joint.pos, angle(leg, joint, index) - joint.ref));
        index += 1;
      }
      chain.push(pose);
      for (const geom of body.geoms) poses.set(geom.mesh, multiply(pose, posed(geom.pos, geom.quat)));
    }
  }
  return poses;
}

/**
 * Where each leg mesh stands for the joint angles `angles`, by mesh index: body-frame mm, with the
 * fly standing at the origin facing +X. Passive joints (the outer tarsi) keep their standing angle.
 */
export function legMeshPoses(kinematics: IBodyKinematics, angles: TAngles): Map<number, TMatrix> {
  return meshPoses(kinematics, posed(kinematics.thorax.pos, kinematics.thorax.quat), (leg, joint) =>
    joint.actuated === null ? joint.standing : angles[leg][joint.actuated]
  );
}

/**
 * Where each leg mesh stood in a recorded frame (obi-one `Body.frame`), in the arena's mm: the
 * thorax at `thorax`, and every joint of every leg's chain at its angle in `joints`, in the order
 * the kinematics list them.
 */
export function recordedLegMeshPoses(
  kinematics: IBodyKinematics,
  thorax: TMatrix,
  joints: ArrayLike<number>
): Map<number, TMatrix> {
  return meshPoses(kinematics, thorax, (_leg, _joint, index) => joints[index]);
}

export interface IPreviewForce {
  segment: string;
  frame: 'body' | 'arena';
  /** µN */
  force: [number, number, number];
  start: number;
  duration: number;
  frequency: number;
}

export interface IPreviewOverride {
  leg: string;
  mode: string;
  start: number;
  duration: number;
  joint: string;
  amplitude: number;
  frequency: number;
}

export interface IBodyPreview {
  frameMs: number;
  /** Each frame's rigid motion of the fly in the arena (mm), after its start placement. */
  fly: TMatrix[];
  /** Each frame's leg mesh poses (body-frame mm), by mesh index. */
  legs: Map<number, TMatrix>[];
  /** Each frame's centre of mass, in the arena (mm). */
  path: number[][];
  /** How far the pushes leave the free body, and how far they turn it in all. */
  displacementMm: number;
  turnDegrees: number;
}

const FRAME_MS = 1000 / 60;
/** How long a leg takes into and out of an override, so the change is seen. */
const EASE_MS = 100;
/** Free-body integration step. */
const SUBSTEP_MS = 0.25;

function active(window: { start: number; duration: number }, time: number): boolean {
  return window.start <= time && time < window.start + window.duration;
}

function overrideAngles(
  kinematics: IBodyKinematics,
  override: IPreviewOverride,
  leg: TLeg,
  time: number,
  held: number[]
): number[] {
  const neutral = kinematics.legs[leg].neutral;
  if (override.mode === 'lift') {
    return neutral.map((angle, joint) => (joint === FEMUR ? angle + LIFT_FEMUR_RADIANS : angle));
  }
  if (override.mode === 'limp') {
    return neutral.map((angle, joint) => {
      if (joint === FEMUR) return angle + LIMP_FEMUR_RADIANS;
      if (joint === TIBIA) return angle + LIMP_TIBIA_RADIANS;
      return angle;
    });
  }
  if (override.mode === 'swing') {
    const swung = LEG_JOINTS.indexOf(override.joint);
    const phase = (2 * Math.PI * override.frequency * (time - override.start)) / 1000;
    const swing = ((override.amplitude * Math.PI) / 180) * Math.sin(phase);
    return held.map((angle, joint) => (joint === swung ? angle + swing : angle));
  }
  return held;
}

/** (x, y, z) turned about +Z. */
function yawed(vector: number[], radians: number): number[] {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [vector[0] * c - vector[1] * s, vector[0] * s + vector[1] * c, vector[2]];
}

function apply3(r: number[][], v: number[]): number[] {
  return r.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
}

function compose3(a: number[][], b: number[][]): number[][] {
  return a.map((row) => [0, 1, 2].map((c) => row[0] * b[0][c] + row[1] * b[1][c] + row[2] * b[2][c]));
}

function transpose3(a: number[][]): number[][] {
  return [0, 1, 2].map((r) => [0, 1, 2].map((c) => a[c][r]));
}

function solve3(a: number[][], b: number[]): number[] {
  const [[a0, a1, a2], [b0, b1, b2], [c0, c1, c2]] = a;
  const det = a0 * (b1 * c2 - b2 * c1) - a1 * (b0 * c2 - b2 * c0) + a2 * (b0 * c1 - b1 * c0);
  if (Math.abs(det) < 1e-30) return [0, 0, 0];
  const column = (k: number) =>
    a.map((row, r) => row.map((value, c) => (c === k ? b[r] : value)));
  const determinant = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  return [0, 1, 2].map((k) => determinant(column(k)) / det);
}

function cross(a: number[], b: number[]): number[] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/**
 * The body's motion from `from` to `to` ms of the episode: standing, with the legs the overrides
 * take moved as they would be, and pushed as a free body that stops when its pushes do.
 */
export function bodyPreview(
  kinematics: IBodyKinematics,
  segments: Record<string, [number, number, number]>,
  {
    forces,
    overrides,
    heading,
    from,
    to,
  }: {
    forces: IPreviewForce[];
    overrides: IPreviewOverride[];
    heading: number;
    from: number;
    to: number;
  }
): IBodyPreview {
  const headingRadians = (heading * Math.PI) / 180;
  const standing = standingAngles(kinematics);

  // The free body, in the arena's frame: centre of mass, velocity, orientation, angular velocity.
  const com0 = yawed(kinematics.com, headingRadians);
  let com = [...com0];
  let velocity = [0, 0, 0];
  let orientation = axisRotation([0, 0, 1], 0);
  let spin = [0, 0, 0];
  let turned = 0;
  const start = axisRotation([0, 0, 1], headingRadians);
  const fly: TMatrix[] = [];
  const legs: Map<number, TMatrix>[] = [];
  const path: number[][] = [];
  let time = from;
  const frames = Math.max(1, Math.ceil((to - from) / FRAME_MS));
  for (let frame = 0; frame < frames; frame++) {
    const frameTime = from + frame * FRAME_MS;
    for (; time < frameTime; time += SUBSTEP_MS) {
      const total = compose3(orientation, start);
      let pushed = false;
      let push = [0, 0, 0];
      let torque = [0, 0, 0];
      for (const force of forces) {
        const centre = segments[force.segment];
        if (!centre || !active(force, time)) continue;

        const scale =
          force.frequency > 0
            ? Math.sin((2 * Math.PI * force.frequency * (time - force.start)) / 1000)
            : 1;
        const vector = force.force.map((v) => v * scale);
        const world = force.frame === 'body' ? apply3(total, vector) : vector;
        const arm = apply3(total, centre.map((v, axis) => v - kinematics.com[axis]));
        push = push.map((v, axis) => v + world[axis]);
        torque = torque.map((v, axis) => v + cross(arm, world)[axis]);
        pushed = true;
      }
      if (!pushed) {
        velocity = [0, 0, 0];
        spin = [0, 0, 0];
        continue;
      }
      // µN = g mm / s², so the step's times are in s.
      const dt = SUBSTEP_MS / 1000;
      velocity = velocity.map((v, axis) => v + (push[axis] / kinematics.mass) * dt);
      com = com.map((v, axis) => v + velocity[axis] * dt);
      const inertia = compose3(compose3(total, kinematics.inertia), transpose3(total));
      const acceleration = solve3(inertia, torque);
      spin = spin.map((v, axis) => v + acceleration[axis] * dt);
      const angle = Math.hypot(...spin) * dt;
      turned += angle;
      if (angle > 0) orientation = compose3(axisRotation(spin, angle), orientation);
    }
    path.push([...com]);
    // world = com + R (p - com0), for a point p placed at the start.
    fly.push(
      multiply(
        multiply(translation(com), rotation(orientation)),
        translation(com0.map((v) => -v))
      )
    );

    const angles = { ...standing };
    for (const override of overrides) {
      const leg = LEG_BY_NAME[override.leg];
      if (!leg || !active(override, frameTime)) continue;

      const target = overrideAngles(kinematics, override, leg, frameTime, standing[leg]);
      const into = Math.min(1, (frameTime - override.start) / EASE_MS);
      const outOf = Math.min(1, (override.start + override.duration - frameTime) / EASE_MS);
      const share = Math.min(into, outOf);
      angles[leg] = standing[leg].map((angle, joint) => angle + (target[joint] - angle) * share);
    }
    legs.push(legMeshPoses(kinematics, angles));
  }
  return {
    frameMs: FRAME_MS,
    fly,
    legs,
    path,
    displacementMm: Math.hypot(...com.map((v, axis) => v - com0[axis])),
    turnDegrees: (turned * 180) / Math.PI,
  };
}

export { IDENTITY };
