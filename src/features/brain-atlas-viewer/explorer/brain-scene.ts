import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * The brain explorer's 3D scene (the user asked for the atlas drawn like their Brain Explorer page): tissue-coloured
 * physical materials lit from the camera with a room's reflections, the cortex turning to glass to show what lies
 * under it, hemispheres hidden or pulled apart, a slicing plane, colour by tissue, lobe or region, a hovered part
 * lit, the focused one pulsing, and the camera flying between views.
 *
 * Every model is drawn in one frame, the human brain's (mm, x to the subject's right, y up, z backwards), so the
 * lights, views and distances hold for all: a model says how its raw coordinates map there (`frame`).
 */
export type TColourMode = 'natural' | 'lobes' | 'regions';
export type TSliceAxis = 'off' | 'sag' | 'cor' | 'axi';
export type TView = 'left' | 'right' | 'front' | 'back' | 'top' | 'bottom';

export interface IBrainPart {
  id: string;
  name: string;
  /** what it is part of, shown with its name */
  group?: string;
  geometry: THREE.BufferGeometry;
  /** its side; a bilateral mesh (B) is cut at the midline into two, so the hemispheres work on it too */
  hemi: 'L' | 'R' | 'M' | 'B';
  /** turned to glass by the Surface slider */
  surface: boolean;
  colours: Partial<Record<TColourMode, string>> & { natural: string };
  finish?: 'fluid' | 'white' | 'tissue';
  /** how much the sulcal depth (the geometry's aSulc) darkens it */
  sulc?: number;
  /** the cerebellum's middle, for its folia */
  folia?: THREE.Vector3;
  /** the atlas region it stands for */
  regionId?: string;
}

export interface IBrainModel {
  key: string;
  parts: IBrainPart[];
  /** raw to the scene's frame: scale · rotation · (raw − centre) */
  frame: { centre: THREE.Vector3; rotation: THREE.Matrix3; scale: number };
  colourModes: TColourMode[];
  colourMode: TColourMode;
  label?: string;
  credits?: string;
}

export interface IBrainLook {
  surface: number;
  explode: number;
  show: { L: boolean; R: boolean };
  slice: { axis: TSliceAxis; t: number };
  colourMode: TColourMode;
  spin: boolean;
}

export const DEFAULT_LOOK: IBrainLook = {
  surface: 1,
  explode: 0,
  show: { L: true, R: true },
  slice: { axis: 'off', t: 0.5 },
  colourMode: 'regions',
  spin: false,
};

const GREY = new THREE.Color('#5c5a66');
const HOME_DIR = new THREE.Vector3(-0.72, 0.25, -0.55);
const HOME_DIST = 470;
const VIEWS: Record<TView, [number, number, number]> = {
  left: [-1, 0.12, 0],
  right: [1, 0.12, 0],
  front: [0, 0.1, -1],
  back: [0, 0.1, 1],
  top: [0, 1, 0.02],
  bottom: [0, -1, -0.02],
};

interface IUniforms {
  uFolia: { value: number };
  uFoliaC: { value: THREE.Vector3 };
  uFresnel: { value: number };
  uSulc: { value: number };
}

interface IRecord {
  part: IBrainPart;
  side: 'L' | 'R' | 'M';
  mesh: THREE.Mesh;
  pre: THREE.Mesh | null;
  mat: THREE.MeshPhysicalMaterial;
  u: IUniforms;
  /** keeps this side of a bilateral part */
  half: THREE.Plane | null;
  centre: THREE.Vector3;
  /** where pulling apart has moved it (world) */
  offset: THREE.Vector3;
  radius: number;
  weight: number;
  base: THREE.Color;
  tColor: THREE.Color;
  tEmis: THREE.Color;
  pulse: boolean;
  ghost: boolean;
}

/** The example's shader additions: darker in the sulci, folia on the cerebellum, a darker inside, glass at the rim. */
function patch(mat: THREE.MeshPhysicalMaterial, u: IUniforms) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSulc;\nvarying float vSulc;\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSulc = aSulc; vObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying float vSulc; varying vec3 vObj;
uniform float uFolia; uniform vec3 uFoliaC; uniform float uFresnel; uniform float uSulc;
float foliaH = 1.0;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  float s = mix(1.0, vSulc, uSulc);
  diffuseColor.rgb *= mix(vec3(0.16, 0.07, 0.09), vec3(1.0), s * s);
  if (uFolia > 0.0) {
    vec3 q = vObj - uFoliaC;
    float ph = atan(q.y, q.z) * 62.0 + 1.4 * sin(q.x * 0.09) + 0.8 * sin(q.x * 0.31 + q.y * 0.2);
    float fade = 1.0 - smoothstep(0.5, 1.5, fwidth(ph));
    foliaH = mix(0.8, smoothstep(-0.9, 0.3, sin(ph)), fade);
    diffuseColor.rgb *= mix(0.55, 1.0, foliaH);
  }
  if (!gl_FrontFacing) diffuseColor.rgb *= vec3(0.46, 0.32, 0.33);
}`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
if (uFolia > 0.0) {
  vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
  float hx = dFdx(foliaH), hy = dFdy(foliaH);
  vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
  float det = dot(dpx, r1);
  normal = normalize(abs(det) * normal - uFolia * sign(det) * (hx * r1 + hy * r2));
}`
      )
      .replace(
        '#include <opaque_fragment>',
        `diffuseColor.a = mix(diffuseColor.a, 1.0, uFresnel * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.2));
#include <opaque_fragment>`
      );
  };
  mat.customProgramCacheKey = () => 'brain-explorer-v1';
}

export class BrainScene {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 5, 4000);
  private readonly controls: OrbitControls;
  private readonly frameGroup = new THREE.Group();
  private readonly lights: THREE.DirectionalLight[];
  private readonly env: THREE.Texture;
  private readonly pmrem: THREE.PMREMGenerator;
  private readonly raycaster = new THREE.Raycaster();
  private readonly slicePlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
  private readonly resize: ResizeObserver;
  private readonly seen: IntersectionObserver;
  private records: IRecord[] = [];
  private model: IBrainModel | null = null;
  private extras: IBrainPart[] = [];
  private points: THREE.Points | null = null;
  private toRaw = new THREE.Matrix3();
  private frameMatrix = new THREE.Matrix4();
  private bounds = { min: new THREE.Vector3(-70, -70, -90), max: new THREE.Vector3(70, 70, 90) };
  private look: IBrainLook = { ...DEFAULT_LOOK };
  private focus: Set<string> | null = null;
  private hover: string | null = null;
  private tween: {
    t0: THREE.Vector3;
    t1: THREE.Vector3;
    n0: THREE.Vector3;
    n1: THREE.Vector3;
    d0: number;
    d1: number;
    start: number;
    ms: number;
  } | null = null;
  private raf = 0;
  private dirty = 2;
  private visible = true;
  private homed = false;
  /** pinned over the focused part, placed every frame */
  label: HTMLElement | null = null;
  /** told when the camera leaves its home, for a reset button */
  onMoved: (() => void) | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly opts: {
      compact?: boolean;
      zoom?: number;
      clear?: string;
      /** px at the foot covered by controls, which the brain is raised clear of */
      inset?: number;
    } = {}
  ) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: !opts.clear, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.localClippingEnabled = true;
    if (opts.clear) renderer.setClearColor(opts.clear, 1);
    else renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.env = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.38;

    const controls = new OrbitControls(this.camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 45;
    controls.maxDistance = 1900;
    controls.zoomToCursor = true;
    controls.rotateSpeed = 0.75;
    controls.autoRotateSpeed = 1.1;
    // a small one sits in a page, whose scroll the wheel keeps
    controls.enableZoom = !opts.compact;
    controls.enablePan = !opts.compact;
    controls.addEventListener('start', () => {
      this.tween = null;
      this.onMoved?.();
    });
    this.controls = controls;

    const key = new THREE.DirectionalLight(0xfff1e6, 2.1);
    const fill = new THREE.DirectionalLight(0x9db8ff, 0.55);
    const rim = new THREE.DirectionalLight(0xffc7d4, 1.3);
    this.lights = [key, fill, rim];
    this.scene.add(key, fill, rim, new THREE.HemisphereLight(0xdfe6ff, 0x2a1d24, 0.4));
    this.frameGroup.matrixAutoUpdate = false;
    this.scene.add(this.frameGroup);

    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(canvas.parentElement ?? canvas);
    this.seen = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.dirty = 2;
    });
    this.seen.observe(canvas);
    this.fit();
    this.camera.position.copy(HOME_DIR).normalize().multiplyScalar(this.homeDist() * 1.5);
    this.raf = requestAnimationFrame(this.frame);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resize.disconnect();
    this.seen.disconnect();
    this.controls.dispose();
    for (const r of this.records) this.dropRecord(r);
    this.records = [];
    if (this.points) {
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
    }
    this.env.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    // its context goes now rather than when collected, as a page holds only so many
    this.renderer.forceContextLoss();
  }

  // ───────────────────────── what is drawn ─────────────────────────

  setModel(model: IBrainModel | null) {
    if (model === this.model) return;
    const first = !this.model;
    this.model = model;
    if (model) {
      const { centre, rotation, scale } = model.frame;
      this.frameMatrix = new THREE.Matrix4()
        .makeScale(scale, scale, scale)
        .multiply(new THREE.Matrix4().setFromMatrix3(rotation))
        .multiply(new THREE.Matrix4().makeTranslation(-centre.x, -centre.y, -centre.z));
      this.frameGroup.matrix.copy(this.frameMatrix);
      this.frameGroup.matrixWorldNeedsUpdate = true;
      this.toRaw = rotation.clone().transpose().multiplyScalar(1 / scale);
    }
    this.sync();
    if (model && (first || !this.homed)) this.home(1800);
  }

  /** Parts beside the model's (a region deeper than its divisions), in its frame. */
  setExtras(parts: IBrainPart[]) {
    this.extras = parts;
    this.sync();
  }

  /** Points in the model's raw frame (x, y, z, w per point), as the atlas's neurons. */
  setPoints(data: Float32Array | null, colour = '#ffffff') {
    if (this.points) {
      this.frameGroup.remove(this.points);
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
      this.points = null;
    }
    if (data && data.length) {
      const n = Math.floor(data.length / 4);
      const xyz = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        xyz[i * 3] = data[i * 4];
        xyz[i * 3 + 1] = data[i * 4 + 1];
        xyz[i * 3 + 2] = data[i * 4 + 2];
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(xyz, 3));
      const m = new THREE.PointsMaterial({
        color: colour,
        size: 1.6,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      this.points = new THREE.Points(g, m);
      this.points.renderOrder = 3;
      this.frameGroup.add(this.points);
    }
    this.dirty = 2;
  }

  private sync() {
    const parts = [...(this.model?.parts ?? []), ...this.extras];
    const kept: IRecord[] = [];
    for (const r of this.records) {
      if (parts.includes(r.part)) kept.push(r);
      else this.dropRecord(r);
    }
    const have = new Set(kept.map((r) => r.part));
    for (const part of parts) if (!have.has(part)) kept.push(...this.makeRecords(part));
    this.records = kept;
    this.measure();
    this.applySlice();
    this.applyVisuals();
    for (const r of this.records) {
      if (!have.has(r.part)) {
        r.mat.color.copy(r.tColor);
        r.mat.emissive.copy(r.tEmis);
      }
    }
  }

  private dropRecord(r: IRecord) {
    this.frameGroup.remove(r.mesh);
    r.mat.dispose();
    if (r.pre) {
      this.frameGroup.remove(r.pre);
      (r.pre.material as THREE.Material).dispose();
    }
  }

  /** A part's world box, from its geometry's raw one. */
  private worldBox(geometry: THREE.BufferGeometry) {
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    return geometry.boundingBox!.clone().applyMatrix4(this.frameMatrix);
  }

  private makeRecords(part: IBrainPart): IRecord[] {
    const box = this.worldBox(part.geometry);
    const span = box.max.x - box.min.x;
    const sides: Array<{ side: 'L' | 'R' | 'M'; box: THREE.Box3; half: THREE.Plane | null }> = [];
    if (part.hemi === 'B') {
      // a side holding less than a sliver of it is not drawn
      if (box.min.x < -0.02 * span)
        sides.push({
          side: 'L',
          box: new THREE.Box3(box.min.clone(), new THREE.Vector3(Math.min(box.max.x, 0), box.max.y, box.max.z)),
          half: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
        });
      if (box.max.x > 0.02 * span)
        sides.push({
          side: 'R',
          box: new THREE.Box3(new THREE.Vector3(Math.max(box.min.x, 0), box.min.y, box.min.z), box.max.clone()),
          half: new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
        });
    } else sides.push({ side: part.hemi, box, half: null });

    const nv = part.geometry.getAttribute('position').count;
    return sides.map(({ side, box: b, half }) => {
      const fluid = part.finish === 'fluid';
      const white = part.finish === 'white';
      const mat = new THREE.MeshPhysicalMaterial({
        roughness: fluid ? 0.18 : white ? 0.6 : 0.46,
        metalness: 0,
        clearcoat: fluid ? 1 : 0.38,
        clearcoatRoughness: fluid ? 0.1 : 0.32,
        sheen: white ? 0.05 : 0.22,
        sheenRoughness: 0.5,
        sheenColor: new THREE.Color('#ffb4a2'),
        side: THREE.DoubleSide,
        emissive: 0x000000,
        clippingPlanes: half ? [half] : null,
      });
      const u: IUniforms = {
        uFolia: { value: part.folia ? 0.9 : 0 },
        uFoliaC: { value: part.folia ?? new THREE.Vector3() },
        uFresnel: { value: 0 },
        uSulc: { value: part.sulc ?? 0 },
      };
      patch(mat, u);
      const mesh = new THREE.Mesh(part.geometry, mat);
      let pre: THREE.Mesh | null = null;
      if (part.surface) {
        // the glass's depth first, so a glass part shows its own near side only
        pre = new THREE.Mesh(
          part.geometry,
          new THREE.MeshBasicMaterial({
            colorWrite: false,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            clippingPlanes: half ? [half] : null,
          })
        );
        pre.visible = false;
        pre.renderOrder = 1;
        this.frameGroup.add(pre);
      }
      this.frameGroup.add(mesh);
      const centre = b.getCenter(new THREE.Vector3());
      const rec: IRecord = {
        part,
        side,
        mesh,
        pre,
        mat,
        u,
        half,
        centre,
        offset: new THREE.Vector3(),
        radius: b.getSize(new THREE.Vector3()).length() / 2,
        weight: half ? nv / 2 : nv,
        base: new THREE.Color(),
        tColor: new THREE.Color(),
        tEmis: new THREE.Color(),
        pulse: false,
        ghost: false,
      };
      mesh.userData.rec = rec;
      return rec;
    });
  }

  private measure() {
    const box = new THREE.Box3();
    for (const r of this.records) box.union(this.worldBox(r.part.geometry));
    if (!box.isEmpty()) this.bounds = { min: box.min, max: box.max };
  }

  // ───────────────────────── how it is drawn ─────────────────────────

  setLook(look: IBrainLook) {
    const spin = look.spin !== this.look.spin;
    const slice = look.slice.axis !== this.look.slice.axis || look.slice.t !== this.look.slice.t;
    this.look = look;
    if (spin) this.controls.autoRotate = look.spin;
    if (slice) this.applySlice();
    this.applyVisuals();
  }

  setFocus(ids: string[] | null) {
    const next = ids && ids.length ? new Set(ids) : null;
    const same =
      (!next && !this.focus) || (next && this.focus && next.size === this.focus.size && [...next].every((id) => this.focus!.has(id)));
    if (same) return;
    this.focus = next;
    this.applyVisuals();
  }

  setHover(id: string | null) {
    if (id === this.hover) return;
    this.hover = id;
    this.canvas.style.cursor = id ? 'pointer' : '';
    this.applyVisuals();
  }

  /** Whether the parts are hidden under the glassable surface (so it should turn to glass to show them). */
  hidden(ids: string[]) {
    const recs = this.records.filter((r) => ids.includes(r.part.id));
    return recs.length > 0 && recs.every((r) => !r.part.surface) && this.records.some((r) => r.part.surface);
  }

  private colourOf(part: IBrainPart) {
    const mode = this.look.colourMode;
    return new THREE.Color(part.colours[mode] ?? part.colours.regions ?? part.colours.natural);
  }

  private applyVisuals() {
    const f = this.focus;
    const { surface, explode: k, show } = this.look;
    const glass = surface < 0.99;
    const pulsing = !this.opts.compact;
    for (const r of this.records) {
      r.base = this.colourOf(r.part);
      const hi = !!f && f.has(r.part.id);
      r.ghost = r.part.surface && glass && !hi;
      let vis = r.side === 'M' || show[r.side];
      if (r.ghost && surface < 0.02) vis = false;
      r.mesh.visible = vis;
      r.tColor.copy(r.base);
      if (f && !hi) r.tColor.lerp(GREY, r.ghost ? 0.6 : 0.86);
      const hov = this.hover === r.part.id;
      r.pulse = pulsing && hi;
      r.tEmis.copy(r.base).multiplyScalar(hov ? 0.3 : hi ? 0.16 : 0);
      const m = r.mat;
      if (m.transparent !== r.ghost) {
        m.transparent = r.ghost;
        m.depthWrite = !r.ghost;
        m.forceSinglePass = r.ghost;
        m.needsUpdate = true;
      }
      m.opacity = r.ghost ? surface : 1;
      r.u.uFresnel.value = r.ghost ? 0.5 * (1 - surface) + 0.12 : 0;
      r.mesh.renderOrder = r.ghost ? 2 : 0;
      if (r.pre) r.pre.visible = vis && r.ghost;
      // pulled apart: out from the middle, and the hemispheres away from each other
      const off = r.offset.copy(r.centre).multiplyScalar(k * 0.55);
      off.x += (r.side === 'L' ? -1 : r.side === 'R' ? 1 : 0) * k * 20;
      r.mesh.position.copy(off.clone().applyMatrix3(this.toRaw));
      if (r.pre) r.pre.position.copy(r.mesh.position);
      if (r.half) r.half.constant = r.side === 'L' ? off.x : -off.x;
    }
    this.dirty = 2;
  }

  private applySlice() {
    const { axis, t } = this.look.slice;
    const L = THREE.MathUtils.lerp;
    const { min, max } = this.bounds;
    this.renderer.clippingPlanes = axis === 'off' ? [] : [this.slicePlane];
    if (axis === 'sag') this.slicePlane.set(new THREE.Vector3(1, 0, 0), -L(min.x - 1, max.x + 1, t));
    if (axis === 'cor') this.slicePlane.set(new THREE.Vector3(0, 0, 1), -L(min.z - 1, max.z + 1, t));
    if (axis === 'axi') this.slicePlane.set(new THREE.Vector3(0, -1, 0), L(max.y + 1, min.y - 1, t));
    this.dirty = 2;
  }

  // ───────────────────────── the camera ─────────────────────────

  private distScale() {
    // a tall box needs the camera further back
    return Math.max(1, 0.9 / this.camera.aspect) / (this.opts.zoom ?? 1);
  }

  private homeDist() {
    return HOME_DIST * this.distScale();
  }

  private fitDist(radius: number) {
    return THREE.MathUtils.clamp(
      (radius / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) * 1.7 + 70,
      310,
      560
    );
  }

  private flyTo(target: THREE.Vector3, dir: THREE.Vector3, dist: number, ms = 950) {
    const o0 = this.camera.position.clone().sub(this.controls.target);
    const n0 = o0.clone().normalize();
    const n1 = dir.clone().normalize();
    if (n0.dot(n1) < -0.95) n0.add(new THREE.Vector3(0.3, 0.4, 0.2)).normalize();
    this.tween = {
      t0: this.controls.target.clone(),
      t1: target.clone(),
      n0,
      n1,
      d0: o0.length(),
      d1: dist * this.distScale(),
      start: performance.now(),
      ms,
    };
  }

  private stepTween(now: number) {
    const tw = this.tween;
    if (!tw) return false;
    const t = Math.min(1, (now - tw.start) / tw.ms);
    const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    this.controls.target.lerpVectors(tw.t0, tw.t1, e);
    const n = tw.n0.clone().lerp(tw.n1, e).normalize();
    this.camera.position.copy(this.controls.target).addScaledVector(n, THREE.MathUtils.lerp(tw.d0, tw.d1, e));
    if (t >= 1) this.tween = null;
    return true;
  }

  /** Nearer or further, the view's direction kept: for a box whose room for the brain changes. */
  setZoom(zoom: number) {
    const was = this.opts.zoom ?? 1;
    if (Math.abs(was - zoom) < 1e-3) return;
    this.opts.zoom = zoom;
    const k = was / zoom;
    const off = this.camera.position.clone().sub(this.controls.target).multiplyScalar(k);
    this.camera.position.copy(this.controls.target).add(off);
    if (this.tween) this.tween.d1 *= k;
    this.dirty = 2;
  }

  home(ms = 950) {
    this.homed = true;
    this.flyTo(new THREE.Vector3(), HOME_DIR, HOME_DIST, ms);
  }

  view(v: TView) {
    this.flyTo(new THREE.Vector3(), new THREE.Vector3(...VIEWS[v]), HOME_DIST);
  }

  /** Flies to the parts, from the side the camera is on (or `side`), as close as fits them. */
  flyToParts(ids: string[], side?: 'L' | 'R') {
    const recs = this.records.filter((r) => ids.includes(r.part.id));
    if (!recs.length) return;
    let s = side ?? (this.camera.position.x >= 0 ? 'R' : 'L');
    if (!this.look.show[s]) s = s === 'L' ? 'R' : 'L';
    let pick = recs.filter((r) => r.side === s || r.side === 'M');
    if (!pick.length) pick = recs;
    const c = new THREE.Vector3();
    let w = 0;
    for (const r of pick) {
      c.addScaledVector(r.centre, r.weight);
      w += r.weight;
    }
    c.divideScalar(w || 1);
    let rad = 10;
    for (const r of pick) rad = Math.max(rad, r.centre.distanceTo(c) + r.radius * 0.8);
    const deep = pick.every((r) => !r.part.surface);
    let dir: THREE.Vector3;
    if (deep) dir = new THREE.Vector3(s === 'L' ? -1 : 1, 0.28, c.z > 20 ? 0.5 : -0.35);
    else {
      dir = c.clone();
      dir.x += (s === 'L' ? -1 : 1) * 25;
      if (dir.lengthSq() < 1) dir.copy(HOME_DIR);
    }
    this.flyTo(c.clone().multiplyScalar(recs.length > 6 ? 0.35 : 0.6), dir, this.fitDist(rad));
  }

  // ───────────────────────── picking ─────────────────────────

  /** The part under a point of the page, or null. */
  pick(clientX: number, clientY: number): IBrainPart | null {
    const box = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - box.left) / box.width) * 2 - 1,
      -((clientY - box.top) / box.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const slicing = this.look.slice.axis !== 'off';
    const test = (list: IRecord[]) => {
      const hits = this.raycaster.intersectObjects(
        list.map((r) => r.mesh),
        false
      );
      for (const h of hits) {
        const rec = h.object.userData.rec as IRecord;
        if (slicing && this.slicePlane.distanceToPoint(h.point) < 0) continue;
        if (rec.half && rec.half.distanceToPoint(h.point) < 0) continue;
        return rec;
      }
      return null;
    };
    const vis = this.records.filter((r) => r.mesh.visible);
    if (this.look.surface < 0.5)
      return (test(vis.filter((r) => !r.ghost)) ?? test(vis.filter((r) => r.ghost)))?.part ?? null;
    return test(vis)?.part ?? null;
  }

  // ───────────────────────── the loop ─────────────────────────

  private fit() {
    const host = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const inset = this.opts.inset ?? 0;
    if (inset) this.camera.setViewOffset(w, h, 0, inset / 2, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.dirty = 2;
  }

  private placeLights() {
    const r = new THREE.Vector3();
    const u = new THREE.Vector3();
    const f = new THREE.Vector3();
    this.camera.matrixWorld.extractBasis(r, u, f);
    const [key, fill, rim] = this.lights;
    key.position.copy(f).multiplyScalar(0.8).addScaledVector(r, -0.55).addScaledVector(u, 0.75);
    fill.position.copy(f).multiplyScalar(0.5).addScaledVector(r, 0.9).addScaledVector(u, -0.2);
    rim.position.copy(f).multiplyScalar(-0.9).addScaledVector(u, 0.6).addScaledVector(r, 0.4);
  }

  private placeLabel() {
    const el = this.label;
    if (!el) return;
    const f = this.focus;
    const recs = f ? this.records.filter((r) => f.has(r.part.id) && r.mesh.visible) : [];
    if (!recs.length) {
      el.style.opacity = '0';
      return;
    }
    // the nearer side's middle
    let best: THREE.Vector3 | null = null;
    let bd = Infinity;
    for (const side of ['L', 'R', 'M'] as const) {
      const rs = recs.filter((r) => r.side === side);
      if (!rs.length) continue;
      const c = new THREE.Vector3();
      let w = 0;
      for (const r of rs) {
        c.addScaledVector(r.centre.clone().add(r.offset), r.weight);
        w += r.weight;
      }
      c.divideScalar(w);
      const d = c.distanceTo(this.camera.position);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (!best) return;
    best.project(this.camera);
    el.style.opacity = best.z < 1 ? '1' : '0';
    el.style.left = `${((best.x + 1) / 2) * this.canvas.clientWidth}px`;
    el.style.top = `${((1 - best.y) / 2) * this.canvas.clientHeight}px`;
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    if (!this.visible || document.hidden) return;
    const flying = this.stepTween(now);
    const turned = this.controls.update();
    const pulse = 0.2 + 0.09 * Math.sin(now * 0.004);
    let fading = false;
    let pulsing = false;
    const target = new THREE.Color();
    for (const r of this.records) {
      const c = r.mat.color;
      c.lerp(r.tColor, 0.16);
      if (Math.abs(c.r - r.tColor.r) + Math.abs(c.g - r.tColor.g) + Math.abs(c.b - r.tColor.b) > 0.004) fading = true;
      else c.copy(r.tColor);
      target.copy(r.pulse ? r.base : r.tEmis);
      if (r.pulse) {
        target.multiplyScalar(pulse);
        pulsing = r.mesh.visible || pulsing;
      }
      const e = r.mat.emissive;
      e.lerp(target, 0.2);
      if (Math.abs(e.r - target.r) + Math.abs(e.g - target.g) + Math.abs(e.b - target.b) > 0.004) fading = true;
      else e.copy(target);
    }
    if (!(flying || turned || fading || pulsing || this.dirty > 0)) return;
    this.dirty = Math.max(0, this.dirty - 1);
    this.placeLights();
    this.renderer.render(this.scene, this.camera);
    this.placeLabel();
  };
}
