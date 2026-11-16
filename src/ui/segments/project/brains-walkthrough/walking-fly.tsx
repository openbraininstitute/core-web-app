'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import { logError } from '@/utils/logger';

import { FRAGMENT, STRENGTH, TINT, VERTEX } from './brain-glass';

import type { ReactNode, RefObject } from 'react';
import type { FramedView } from '@/features/viewer-3d/bare';
import type { CameraPose, ViewFrame } from '@/features/viewer-3d/engine/scene-view';

/**
 * NeuroMechFly (flygym 1.2.1) walking, turning left a quarter turn and stopping, its body as glass, and where the
 * Male CNS sits in it (record_walk.py then build_walk.py, in the home_page group's harness/fly_walk).
 */
const FLY_WALK = '/static/walkthrough/fly-walk.bin';

/**
 * Simulated seconds played a second: walking in, some eleven times slower than it walked, for its steps to be
 * seen over the little way it has before it turns, then five times slower through the turn and the stop.
 */
const SLOW_WALK = 0.09;
const SLOW_TURN = 0.2;
/** Frames either side of the turn's start over which the one pace becomes the other. */
const RAMP_FRAMES = 30;
/** How long after the CNS is built and on show the fly sets off, ms. */
const WALK_AFTER_MS = 300;
/** How far above the floor the fly is seen from, radians: in front of where it ends up facing, a little above. */
const ELEVATION = (10 * Math.PI) / 180;
/** How much of its view's width the fly's length takes, standing. */
const FLY_FILL = 0.5;
/** How long the CNS takes to come out of the fly to the first screen, or back, ms: as the floating models glide. */
const GLIDE_MS = 1000;
/** How far into the glide back the body comes again, round the CNS nearly in its place in it. */
const BODY_BACK_AT = 0.75;
/** Each body's pose in the walk: position, um, and quaternion (x, y, z, w) over 32767. */
const STRIDE = 7;

interface FlyWalk {
  /** Frames a simulated second, how many, and the one the turn starts on. */
  hz: number;
  frames: number;
  turn: number;
  /** The trunk, in the thorax's frame, then each leg segment, in its own, mm. */
  parts: THREE.BufferGeometry[];
  /** Each frame: the thorax's pose in the world, then each leg segment's in the thorax's frame. */
  poses: Int16Array;
  /** The middle of the fly as it stands, in the thorax's frame, mm, and how long it is. */
  middle: THREE.Vector3;
  length: number;
  /** From the Male CNS's pack, um, into the thorax's frame, mm. */
  placement: THREE.Matrix4;
}

interface Header {
  hz: number;
  frames: number;
  parts: Array<{ vertices: number; triangles: number; positions: number; normals: number; indices: number }>;
  legs: string[];
  phases: Record<'walk' | 'turn' | 'stop', [number, number]>;
  animation: number;
  middle: [number, number, number];
  cns: { placement: number[] };
}

let loading: Promise<FlyWalk> | null = null;

/** The walk the app serves, read once for the page. */
function loadFlyWalk(): Promise<FlyWalk> {
  loading ??= fetch(FLY_WALK)
    .then((response) => {
      if (!response.ok) throw new Error(`${FLY_WALK}: ${response.status}`);
      return response.arrayBuffer();
    })
    .then(readFlyWalk);
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

function readFlyWalk(buffer: ArrayBuffer): FlyWalk {
  const length = new DataView(buffer).getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, length))) as Header;
  const at = 4 + length;
  const parts = header.parts.map((part) => {
    const geometry = new THREE.BufferGeometry();
    const um = new Int16Array(buffer, at + part.positions, part.vertices * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(um, (v) => v / 1000), 3));
    geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Int8Array(buffer, at + part.normals, part.vertices * 3), 3, true)
    );
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(buffer, at + part.indices, part.triangles * 3), 1));
    return geometry;
  });
  const bodies = 1 + header.legs.length;
  const poses = new Int16Array(buffer, at + header.animation, header.frames * bodies * STRIDE);
  // Standing, from the hind end of its folded wings to the tips of its forelegs.
  const box = new THREE.Box3();
  for (const geometry of parts.slice(0, 1)) {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) box.union(geometry.boundingBox);
  }
  const middle = new THREE.Vector3(...header.middle);
  return {
    hz: header.hz,
    frames: header.frames,
    turn: header.phases.turn[0],
    parts,
    poses,
    middle,
    length: 2 * Math.max(middle.x - box.min.x, box.max.x - middle.x),
    placement: new THREE.Matrix4().set(...(header.cns.placement as Parameters<THREE.Matrix4['set']>)),
  };
}

/** Body `body` (0 the thorax, then the legs' segments) at `frame`, between the two frames about it. */
function poseAt(
  walk: FlyWalk,
  frame: number,
  body: number,
  position: THREE.Vector3,
  quaternion: THREE.Quaternion
): void {
  const last = walk.frames - 1;
  const f = Math.min(Math.max(frame, 0), last);
  const a = Math.floor(f);
  const b = Math.min(a + 1, last);
  const k = f - a;
  const bodies = walk.poses.length / (walk.frames * STRIDE);
  const p = walk.poses;
  const i = (a * bodies + body) * STRIDE;
  const j = (b * bodies + body) * STRIDE;
  const mix = (n: number) => p[i + n] + (p[j + n] - p[i + n]) * k;
  position.set(mix(0), mix(1), mix(2)).multiplyScalar(0.001);
  quaternion.set(mix(3), mix(4), mix(5), mix(6)).normalize();
}

/** What the fly over the landing is told from outside its view: where the page is, and what it moves. */
interface FlyStage {
  /** Past the landing, on the first screen. */
  entered: boolean;
  /** The CNS is built and on show. */
  started: boolean;
  /** What carries the view across the page as the fly walks. */
  walk: RefObject<HTMLDivElement | null>;
}

const FlyStageContext = createContext<FlyStage | null>(null);

export function FlyStageProvider({ stage, children }: { stage: FlyStage; children: ReactNode }) {
  return <FlyStageContext.Provider value={stage}>{children}</FlyStageContext.Provider>;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** The camera's turn for a pose: its z from the target towards the camera, its y up the screen. */
function orientation({ from, up }: CameraPose): THREE.Quaternion {
  const z = new THREE.Vector3(...from).normalize();
  const x = new THREE.Vector3(...up).cross(z).normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/** `k` of the way from one pose to another: turned the shortest way, its scale in proportion. */
function blend(a: CameraPose, b: CameraPose, k: number): CameraPose {
  const turn = orientation(a).slerp(orientation(b), k);
  const [ax, ay, az] = a.target;
  const [bx, by, bz] = b.target;
  return {
    target: [ax + (bx - ax) * k, ay + (by - ay) * k, az + (bz - az) * k],
    from: new THREE.Vector3(0, 0, 1).applyQuaternion(turn).toArray(),
    up: new THREE.Vector3(0, 1, 0).applyQuaternion(turn).toArray(),
    umPerPx: a.umPerPx * (b.umPerPx / a.umPerPx) ** k,
  };
}

const samePose = (a: CameraPose | null, b: CameraPose) =>
  !!a &&
  a.umPerPx === b.umPerPx &&
  [0, 1, 2].every((i) => a.target[i] === b.target[i] && a.from[i] === b.from[i] && a.up[i] === b.up[i]);

/**
 * NeuroMechFly's body as glass round the Male CNS over the landing, walking in along the bottom right from past
 * the page's edge, turning left to face the page and stopping there: the walk played back slowed, its legs as the
 * simulation moved them, the view's camera held where the world's would see the fly from, and the view carried
 * across the page as the fly walks. As the first screen comes, the body fades and the CNS turns and grows into its
 * place there, the view let go of; back on the landing, it goes back into the fly, standing.
 */
export function FlyBody({ view }: { view: FramedView }) {
  const stage = useContext(FlyStageContext);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [walk, setWalk] = useState<FlyWalk | null>(null);
  const latest = useRef({ entered: stage?.entered ?? false, started: stage?.started ?? false });
  const poke = useRef<(() => void) | null>(null);
  const walkRef = stage?.walk;

  useEffect(() => {
    let gone = false;
    loadFlyWalk().then(
      (loaded) => {
        if (!gone) setWalk(loaded);
      },
      (e: unknown) => logError('Could not load the fly to walk over the landing', e)
    );
    return () => {
      gone = true;
    };
  }, []);

  useEffect(() => {
    latest.current = { entered: stage?.entered ?? false, started: stage?.started ?? false };
    poke.current?.();
  }, [stage?.entered, stage?.started]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const carrier = walkRef?.current;
    const { holdCamera, framedCamera, cameraNow } = view;
    if (!canvas || !carrier || !walk || !holdCamera || !framedCamera || !cameraNow) return;
    const hold = holdCamera.bind(view);
    const framed = framedCamera.bind(view);
    const now = cameraNow.bind(view);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { tint: { value: TINT }, strength: { value: STRENGTH } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    // The thorax's frame, mm, carried into the view's: into the CNS's pack, um, less the view's origin.
    const fly = new THREE.Group();
    fly.matrixAutoUpdate = false;
    const parts = walk.parts.map((geometry) => {
      const part = new THREE.Mesh(geometry, material);
      part.matrixAutoUpdate = false;
      part.frustumCulled = false;
      fly.add(part);
      return part;
    });
    const scene = new THREE.Scene();
    scene.add(fly);
    const camera = new THREE.Camera();
    camera.matrixAutoUpdate = false;
    camera.matrixWorldAutoUpdate = false;
    const intoCns = walk.placement.clone().invert();
    const shift = new THREE.Matrix4();
    // Directions of the thorax's frame into the pack's.
    const turnIntoCns = new THREE.Matrix3().setFromMatrix4(intoCns);
    const middleInCns = walk.middle.clone().applyMatrix4(intoCns);

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const ONE = new THREE.Vector3(1, 1, 1);
    /** The legs as they are at `frame`. */
    const stepTo = (frame: number) => {
      for (let leg = 1; leg < parts.length; leg++) {
        poseAt(walk, frame, leg, position, quaternion);
        parts[leg].matrix.compose(position, quaternion, ONE);
      }
    };

    // The world: the floor's plane, z up. Seen from in front of where the fly ends up facing, a little above.
    const last = walk.frames - 1;
    const worldUp = new THREE.Vector3(0, 0, 1);
    poseAt(walk, last, 0, position, quaternion);
    const facing = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).setZ(0).normalize();
    const fromWorld = facing.multiplyScalar(Math.cos(ELEVATION)).addScaledVector(worldUp, Math.sin(ELEVATION));
    const across = new THREE.Vector3().crossVectors(worldUp, fromWorld).normalize();
    const upScreen = new THREE.Vector3().crossVectors(fromWorld, across);

    let width = 0;
    const umPerPx = () => (1000 * walk.length) / (FLY_FILL * Math.max(1, width || carrier.clientWidth));
    /** Where the camera sees the fly from at `frame`, in the pack's frame. */
    const landingPose = (frame: number): CameraPose => {
      poseAt(walk, frame, 0, position, quaternion);
      const back = quaternion.clone().invert();
      const from = fromWorld.clone().applyQuaternion(back).applyMatrix3(turnIntoCns).normalize();
      const up = worldUp.clone().applyQuaternion(back).applyMatrix3(turnIntoCns).normalize();
      return { target: middleInCns.toArray(), from: from.toArray(), up: up.toArray(), umPerPx: umPerPx() };
    };
    /** Where the fly's middle is across the view's plane at `frame`, CSS px of the view, from where it ends up. */
    const pointAt = (frame: number) => {
      poseAt(walk, frame, 0, position, quaternion);
      const world = walk.middle.clone().applyQuaternion(quaternion).add(position);
      const px = 1000 / umPerPx();
      return { x: world.dot(across) * px, y: -world.dot(upScreen) * px };
    };
    const landingShift = (frame: number) => {
      const at = pointAt(frame);
      const end = pointAt(last);
      return { x: at.x - end.x, y: at.y - end.y };
    };
    /** The frame the walk starts on: the last with the fly still wholly past the page's right edge. */
    const firstFrame = () => {
      const rest = (carrier.parentElement ?? carrier).getBoundingClientRect();
      const scale = rest.width / Math.max(1, carrier.offsetWidth);
      const half = (1000 * walk.length) / 2 / umPerPx();
      const needed = (window.innerWidth - (rest.left + rest.width / 2)) / scale + half;
      let frame = 0;
      while (frame < last && landingShift(frame + 1).x >= needed) frame++;
      return frame;
    };

    let seen: ViewFrame | null = null;
    // Let go of on the first screen, the view turns on its own, the body gone.
    let away = false;
    const draw = (frame: ViewFrame) => {
      seen = frame;
      if (away) return;
      if (frame.width !== width) {
        // Resized, the fly is sized to its view again.
        if (width) poke.current?.();
        width = frame.width;
        renderer.setSize(frame.width, frame.height, false);
      }
      camera.matrixWorldInverse.copy(frame.view);
      camera.matrixWorld.copy(frame.view).invert();
      camera.projectionMatrix.copy(frame.projection);
      camera.projectionMatrixInverse.copy(frame.projection).invert();
      const [x, y, z] = frame.origin;
      fly.matrix.multiplyMatrices(shift.makeTranslation(-x, -y, -z), intoCns);
      fly.matrixWorldNeedsUpdate = true;
      renderer.render(scene, camera);
    };
    const offFrame = view.onFrame(draw);

    // The walk: the frame it starts on, when, and where it is.
    let from: number | null = null;
    let startAt = 0;
    let frame = 0;
    let lastTime = 0;
    // Where motion is to be kept down, or made past the landing, it is found standing.
    let walked =
      latest.current.entered || (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    const pace = (at: number) => {
      const k = THREE.MathUtils.smoothstep(at, walk.turn - RAMP_FRAMES, walk.turn + RAMP_FRAMES);
      return SLOW_WALK + (SLOW_TURN - SLOW_WALK) * k;
    };
    // Where the page is going, and the glide there.
    let first = latest.current.entered;
    let glide: { pose: CameraPose; shifted: { x: number; y: number }; start: number } | null = null;
    let held: CameraPose | null = null;
    let shifted = { x: 0, y: 0 };
    let raf = 0;

    const tick = (time: number) => {
      raf = 0;
      const { entered, started } = latest.current;
      if (entered !== first) {
        // Off to the other place, from where it is now, the camera held there if it was let go of.
        first = entered;
        const pose = held ?? now();
        if (pose) {
          glide = { pose, shifted: { ...shifted }, start: time };
          if (away) {
            away = false;
            hold(pose);
            held = pose;
          }
        }
        // Gone past the landing before or while it walked, it is found standing when the landing comes back.
        if (entered) walked = true;
      }
      if (from === null && width > 0) {
        from = firstFrame();
        frame = from;
      }
      const walking = !walked && started && !first && from !== null;
      if (walking && from !== null) {
        if (!startAt) startAt = time + WALK_AFTER_MS;
        if (time > startAt) frame += (Math.min(time - Math.max(lastTime, startAt), 100) / 1000) * pace(frame) * walk.hz;
        if (frame >= last) {
          frame = last;
          walked = true;
        }
      }
      // Left mid-walk, its legs stay as they were while it fades.
      if (walked && !first) frame = last;
      lastTime = time;
      stepTo(frame);

      let pose: CameraPose | null;
      let to = { x: 0, y: 0 };
      if (first) pose = framed();
      else {
        pose = landingPose(frame);
        to = landingShift(frame);
      }
      let k = 1;
      if (glide && pose) {
        k = ease(Math.min(1, (time - glide.start) / GLIDE_MS));
        pose = blend(glide.pose, pose, k);
        to = { x: glide.shifted.x + (to.x - glide.shifted.x) * k, y: glide.shifted.y + (to.y - glide.shifted.y) * k };
        if (k >= 1) glide = null;
      } else glide = null;
      shifted = to;
      carrier.style.transform = `translate(${to.x}px, ${to.y}px)`;
      // Out of the fly, the body fades at once; back into it, once the CNS is nearly where it sits in it.
      canvas.style.opacity = !first && k >= BODY_BACK_AT ? '1' : '0';
      let drawn = false;
      if (first && !glide) {
        // On the first screen, the view is let go of, to its framing and its spin.
        if (!away) {
          away = true;
          held = null;
          hold(null);
        }
      } else if (pose && !samePose(held, pose)) {
        held = pose;
        hold(pose);
        drawn = true;
      }
      // Still, the view draws nothing: the legs are drawn over its last frame.
      if (!drawn && seen && !first) draw(seen);
      if (walking || glide || (from === null && !first)) raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    poke.current = wake;
    wake();
    return () => {
      poke.current = null;
      cancelAnimationFrame(raf);
      offFrame();
      hold(null);
      carrier.style.transform = '';
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, [view, walk, walkRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 block h-full w-full transition-opacity duration-500 ease-out"
      style={{ opacity: 0 }}
    />
  );
}
