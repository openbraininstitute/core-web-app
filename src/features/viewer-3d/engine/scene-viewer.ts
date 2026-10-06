import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import {
  distanceFor,
  fitHalfHeight,
  fogRange,
  halfHeightAt,
  orthoClip,
  orthoPixelScale,
} from './camera';
import { DepthNormalsPass } from './depth-normals-pass';
import { clipRange, depthSpan, fitDistance, orbitRadius } from './framing';
import { type Axis, axisView, type Sign } from './gizmo';
import {
  backgroundCss,
  createLooks,
  DEFAULT_LOOK,
  type Look,
  makeEnvironment,
  PLAIN,
  type SurfaceAttribute,
  setDepthRange,
  type ThemeColors,
  withDisplacement,
} from './looks';
import { followScreenUp, glideLeft, stopGlide, turnCamera } from './rotation';

/**
 * Ambient occlusion is computed at this fraction of the device resolution.
 * It is a low-frequency effect, and the pass costs several taps per pixel.
 */
const AO_SCALE = 0.5;
/** Screen-space AO radius in CSS pixels; it follows the zoom, not the geometry. */
const AO_RADIUS_CSS = 32;
/** Fraction of the way from the centre to the edge of the view that the farthest-reaching side of a cell comes to on reset. */
const FIT_FILL = 0.92;
/** Vertical field of view of the perspective camera, degrees. */
const FOV = 45;
/** How long the camera takes to turn to an axis the gizmo was clicked on, ms. */
const TURN_MS = 300;
/** The most device pixels a CSS pixel is drawn with: a 3× phone draws at 2×. */
export const MAX_PIXEL_RATIO = 2;
/** The layer of what `drawUnseen` draws, which the lights are on as well. */
const UNSEEN_LAYER = 31;
/**
 * How long the view still counts as moving once a gesture moved it, ms. A wheel notch moves it at once, in OrbitControls'
 * own handler: without the wait, a content that draws less while the view moves would draw in full between two notches.
 */
const MOVING_FOR_MS = 200;
/**
 * How fast OrbitControls' glide after a gesture dies away, ms: as three's damping of 0.05 a frame does at 120 Hz. Three
 * damps by the frame, which drew the glide out over seconds where frames are slow. Its handlers damp between frames by
 * the factor the last frame set, so a drag keeps the lag it has at 120 Hz, as browsers send a pointer move a frame.
 */
const GLIDE_MS = 160;
/** What is left of a glide when it ends, in CSS pixels at the cell's far side: too little to see. */
const GLIDE_STOP_PX = 2;
/** The frame times the glide's easing is worked out for, ms: past a stall, or with a clock that stands still. */
const FRAME_MS = { min: 1000 / 240, max: 250 };
const sphere = new THREE.Sphere();

export type Projection = 'orthographic' | 'perspective';

/** What the chrome over a view drives and listens to: the axes gizmo and the scale bar. */
export interface ViewControls {
  /** µm per CSS pixel in the orthographic view, null in perspective. */
  readonly currentPixelScale: number | null;
  onPixelScaleChange(listener: (scale: number | null) => void): () => void;
  onViewChange(listener: (orientation: Readonly<THREE.Quaternion>) => void): () => void;
  viewAlong(axis: Axis, sign: Sign): void;
}

export type AODepth = 'own-pass' | 'main-pass';

export interface SceneViewerOptions {
  /** The vertex attributes of the content's surface, which the looks are built for (`createLooks`). */
  surface: readonly SurfaceAttribute[];
  /**
   * Where the ambient occlusion takes the depth from. Its own pass draws the surfaces a second time, as displaced as
   * they are drawn, into a depth and normal target of its own. The main pass's depth costs no second draw, and the
   * normals are rebuilt from it.
   */
  aoDepth?: AODepth;
  /**
   * Draw every frame through the composer's multisampled target, onto a canvas without antialiasing of its own. By
   * default frames go straight to an antialiased canvas whenever no pass is on.
   */
  composeAlways?: boolean;
  /** Which GPU to ask for, where there are two: the discrete one for a heavy surface, at some battery. */
  powerPreference?: WebGLPowerPreference;
}

/**
 * What the composer's targets hold: half floats, 4× multisampled where the scene is drawn, or 8-bit colour where the
 * GPU can't draw into half floats, which would leave the view blank; and no more samples than the format allows.
 */
function composerFormat(gl: WebGL2RenderingContext): {
  type: THREE.TextureDataType;
  samples: number;
} {
  const samples = (format: GLenum) => {
    const counts = gl.getInternalformatParameter(gl.RENDERBUFFER, format, gl.SAMPLES);
    // In descending order; none where the format can't be drawn into.
    return counts instanceof Int32Array && counts.length > 0 ? Math.min(4, counts[0]) : null;
  };
  const half = samples(gl.RGBA16F);
  if (half !== null) return { type: THREE.HalfFloatType, samples: half };
  return { type: THREE.UnsignedByteType, samples: samples(gl.RGBA8) ?? 0 };
}

/** A composer whose scene target is multisampled where `antialias`, in the formats `composerFormat` finds. */
function makeComposer(renderer: THREE.WebGLRenderer, antialias: boolean): EffectComposer {
  const composer = new EffectComposer(renderer);
  const { type, samples } = composerFormat(renderer.getContext() as WebGL2RenderingContext);
  composer.renderTarget1.texture.type = type;
  composer.renderTarget2.texture.type = type;
  composer.renderTarget2.samples = antialias ? samples : 0;
  composer.renderTarget1.depthBuffer = false;
  return composer;
}

/** A composer and its passes: render → normals from depth → GTAO → bloom → output, drawing at `scale` of the resolution. */
interface Pipeline {
  composer: EffectComposer;
  render: RenderPass;
  gtao: GTAOPass;
  /** The normals the occlusion reads, where it takes its depth from the main pass. */
  depthNormals: DepthNormalsPass | null;
  bloom: UnrealBloomPass | null;
  output: OutputPass;
  scale: number;
  antialias: boolean;
}

/** How a frame drawn while the camera moves is cut down, or was drawn. */
export interface MovingFrame {
  /** With the ambient occlusion, where it is on. */
  ao: boolean;
  /** At this fraction of the resolution, scaled up onto the canvas. */
  scale: number;
  /** Multisampled, as still frames are. */
  antialias: boolean;
}

/** three's output pass, which can also darken the scene by the occlusion (`blendAO`) as it tone maps. */
function aoOutputPass(): OutputPass {
  const pass = new OutputPass();
  const material = pass.material as THREE.RawShaderMaterial;
  const blended = material.fragmentShader
    .replace(
      'uniform sampler2D tDiffuse;',
      'uniform sampler2D tDiffuse;\nuniform sampler2D tAO;\nuniform float aoIntensity;'
    )
    .replace(
      'gl_FragColor = texture2D( tDiffuse, vUv );',
      // The same multiply as GTAO's own blend.
      'gl_FragColor = texture2D( tDiffuse, vUv );\n' +
        'if ( aoIntensity > 0.0 ) gl_FragColor.rgb *= mix( vec3( 1.0 ), texture2D( tAO, vUv ).rgb, aoIntensity );'
    );
  if (!blended.includes('uniform float aoIntensity') || !blended.includes('aoIntensity > 0.0')) {
    console.warn('OutputShader has changed: GTAO blends the ambient occlusion itself again');
    return pass;
  }
  material.fragmentShader = blended;
  // Uniforms, not defines: the pass rebuilds its defines whenever the tone mapping changes.
  pass.uniforms.tAO = { value: null };
  pass.uniforms.aoIntensity = { value: 0 };
  return pass;
}

/**
 * Draw a frame through `p`. The scene goes into the read buffer, which must be the multisampled one; the passes
 * enabled may swap the two an odd number of times per frame.
 */
function composeFrame(p: Pipeline): void {
  const c = p.composer;
  if (c.readBuffer !== c.renderTarget2) c.swapBuffers();
  c.render();
}

/**
 * The scene's depth is resolved out of its multisampled target only for the occlusion that reads it, and otherwise
 * not kept past the frame: a tiled GPU then never writes it out.
 */
function resolveDepth(p: Pipeline, on: boolean): void {
  const target = p.composer.renderTarget2;
  const read = on && target.depthTexture !== null;
  target.resolveDepthBuffer = read;
  // Not with the occlusion on: three then discards the resolved depth with the multisampled one.
  target.storeMultisampledDepthBuffer = read;
}

/** The passes on or off for a frame: the occlusion's as `ao` says, and bloom where the look blooms. */
function setPasses(p: Pipeline, ao: boolean, bloom: boolean): void {
  if (p.bloom) p.bloom.enabled = bloom;
  p.gtao.enabled = ao;
  if (p.depthNormals) p.depthNormals.enabled = ao;
  resolveDepth(p, ao);
  blendAO(p, ao);
}

/**
 * Where the occlusion darkens the scene: in the output pass, as it tone maps, sparing a copy of the scene and a blend
 * over it at full size; or, with bloom on, by GTAO itself, so that what blooms is occluded already.
 */
function blendAO({ gtao, output, bloom }: Pipeline, on: boolean): void {
  if (!output.uniforms.aoIntensity) return;
  const inOutput = on && !bloom?.enabled;
  gtao.output = inOutput ? GTAOPass.OUTPUT.Off : GTAOPass.OUTPUT.Default;
  gtao.needsSwap = !inOutput;
  output.uniforms.tAO.value = gtao.gtaoMap;
  output.uniforms.aoIntensity.value = inOutput ? gtao.blendIntensity : 0;
}

function disposePipeline(p: Pipeline): void {
  for (const pass of p.composer.passes) pass.dispose();
  p.composer.dispose();
}

function disposeMaterial(material: THREE.Material): void {
  for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
  material.dispose();
}

/**
 * A three.js view of a surface: the renderer, both cameras, OrbitControls, the render-on-demand loop, the looks, and
 * the ambient-occlusion and bloom passes. The content puts its meshes in `chunks`, where they take the look's
 * material, and their inverted hulls in `outlines`, and frames the view with `bounds` and `fitPoints`. It sits around
 * the origin, which the camera orbits.
 */
export class SceneViewer implements ViewControls {
  readonly looks: Look[];
  protected renderer: THREE.WebGLRenderer;
  protected scene = new THREE.Scene();
  private perspective = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100000);
  private orthographic = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  private projection: Projection = 'orthographic';
  protected controls: OrbitControls;
  protected chunks = new THREE.Group();
  protected outlines = new THREE.Group();
  /** The chunks and outlines, without the overlays: what ambient occlusion is computed from. A scene, for the pass. */
  protected surfaces = new THREE.Scene();
  protected bounds = new THREE.Box3(
    new THREE.Vector3(-50, -50, -50),
    new THREE.Vector3(50, 50, 50)
  );
  /** Points (x, y, z after one another) that `resetView` fits into the view instead of the corners of `bounds`. */
  protected fitPoints: Float32Array | null = null;
  /** Every so many of the surface's vertices (x, y, z after one another), for the depth-coded look; null without one. */
  protected depthSample: Float32Array | null = null;
  /** Made the first time a look reflects it. */
  private environment: THREE.Texture | null = null;
  protected look: Look;
  protected meshVisible = true;
  private wireframe = false;
  private dark = false;
  private surfaceColor: ThemeColors = PLAIN;
  private ao = false;
  /** What frames are drawn through: the scene into a multisampled target, then the passes. */
  private main: Pipeline | null = null;
  /**
   * How frames drawn while the camera moves are cut down, as on a GPU too slow to draw them as still ones; null draws
   * them as still ones. It applies only through the composer, and where the look blooms only to the occlusion.
   */
  protected motionFrame: MovingFrame | null = null;
  /** What moving frames are drawn through under full resolution or without antialiasing, made the first time one is. */
  private movingPipeline: Pipeline | null = null;
  private unseenTarget: THREE.WebGLRenderTarget | null = null;
  /** The canvas's size in CSS pixels, as `resize` left it. */
  private width = 1;
  private height = 1;
  private viewDir = new THREE.Vector3();
  /** Set whenever something other than the camera changed; the loop only renders when needed. */
  private dirty = true;
  /** The animation loop stops once nothing moves and nothing has changed; `invalidate` starts it again. */
  private looping = false;
  /**
   * When a gesture last moved the camera, which counts as moving for `MOVING_FOR_MS`, and whether the last frame was
   * drawn as moving: a still one is owed after it.
   */
  private movedAt = Number.NEGATIVE_INFINITY;
  protected drawnMoving = false;
  /** Frames drawn since the loop last started, or the page was hidden: the GPU wakes up over the first few. */
  protected framesDrawn = 0;
  /** A gesture is under way, between OrbitControls' start and end: a drag, a wheel turned, a pinch. */
  private gesture = false;
  /** When the loop last turned, null while it is stopped, and how long its last turn took, for the glide's easing. */
  private lastFrameAt: number | null = null;
  private frameMs = 1000 / 120;
  private disposed = false;
  private resizeObserver: ResizeObserver;
  /** Off screen, nothing is drawn, and the loop doesn't turn: a spinning view scrolled past costs nothing. */
  private onScreen = true;
  private intersection: IntersectionObserver | null = null;
  /** The view has been on screen in a page on show (`seen`). */
  private seenOnce = false;
  private seenListeners = new Set<() => void>();
  private pixelScale: number | null = null;
  private pixelScaleListeners = new Set<(scale: number | null) => void>();
  private wheelListeners = new Set<() => void>();
  private viewListeners = new Set<(orientation: Readonly<THREE.Quaternion>) => void>();
  /** The camera's orientation as the view listeners last heard it. */
  private heardOrientation = new THREE.Quaternion();
  /** The camera turning to view along an axis: its orientation at either end, and when it set off. */
  private turn: { from: THREE.Quaternion; to: THREE.Quaternion; start: number } | null = null;

  constructor(
    protected container: HTMLElement,
    private options: SceneViewerOptions
  ) {
    // Transparent canvas over CSS backgrounds: gradients stay untouched by tone mapping and post-processing. Drawn
    // through the composer every frame, the canvas only takes the output pass's quad: no depth, nor antialiasing.
    this.renderer = new THREE.WebGLRenderer({
      antialias: !options.composeAlways,
      depth: !options.composeAlways,
      alpha: true,
      powerPreference: options.powerPreference ?? 'default',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMappingExposure = 0.95;
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);

    this.perspective.position.set(0, 0, 500);
    this.orthographic.position.set(0, 0, 500);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.autoRotateSpeed = 0.7;
    // Wheel and pointer handlers apply their change inside OrbitControls itself, so the per-frame
    // update() alone would miss them; the change event catches every path.
    this.controls.addEventListener('change', this.onControlsChange);
    this.controls.addEventListener('start', this.onControlsStart);
    this.controls.addEventListener('end', this.onControlsEnd);
    // Before OrbitControls sees it: outside fullscreen a plain wheel scrolls the page.
    container.addEventListener('wheel', this.onWheel, { capture: true });

    // Light rigs ride on the camera so every look keeps its lighting while orbiting.
    this.looks = createLooks(this.renderer.getPixelRatio(), options.surface);
    for (const l of this.looks) {
      if (!l.rig) continue;
      this.camera.add(l.rig);
      l.rig.traverse((o) => o.layers.enable(UNSEEN_LAYER));
    }
    this.scene.add(this.perspective, this.orthographic);
    this.outlines.name = 'outline';
    this.surfaces.add(this.chunks, this.outlines);
    this.scene.add(this.surfaces);
    this.look = this.looks.find((l) => l.id === DEFAULT_LOOK) ?? this.looks[0];
    // Nothing here calls a method a subclass overrides: its fields are only set once this returns.
    this.paintLook();
    this.applyBackground();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    if (typeof IntersectionObserver !== 'undefined') {
      this.intersection = new IntersectionObserver((entries) => {
        const entry = entries.at(-1);
        if (entry) this.screenChanged(entry.isIntersecting);
      });
      this.intersection.observe(container);
    } else this.checkSeen();
    document.addEventListener('visibilitychange', this.onVisibility);
    this.fitCanvas();
    if (options.composeAlways) this.ensureComposer();
    this.invalidate();
  }

  protected get camera(): THREE.PerspectiveCamera | THREE.OrthographicCamera {
    return this.projection === 'perspective' ? this.perspective : this.orthographic;
  }

  dispose(): void {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.resizeObserver.disconnect();
    this.intersection?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.seenListeners.clear();
    this.container.removeEventListener('wheel', this.onWheel, { capture: true });
    this.controls.removeEventListener('change', this.onControlsChange);
    this.controls.removeEventListener('start', this.onControlsStart);
    this.controls.removeEventListener('end', this.onControlsEnd);
    this.controls.dispose();
    this.disposeContent();
    for (const l of this.looks) {
      disposeMaterial(l.material);
      if (l.outline) disposeMaterial(l.outline);
    }
    this.environment?.dispose();
    this.disposeComposer();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.pixelScaleListeners.clear();
    this.wheelListeners.clear();
    this.viewListeners.clear();
  }

  /** Free what the content put in the scene, as the viewer is disposed of, before the renderer goes. */
  protected disposeContent(): void {}

  // ---------------------------------------------------------------------------
  // Rendering

  /**
   * Render only when the camera moved (including damping and spin) or the scene changed, and stop when neither did,
   * once a frame has been drawn still after the camera stopped, and the content has no work left (`work`).
   */
  private frame(): void {
    const turning = this.turn !== null;
    this.stepTurn();
    const now = performance.now();
    const eased = this.easing(now);
    // Let go of, a glide stops short of the little left; held, that is turned at once, as a slow drag adds a pixel or
    // two a move, all of which must be turned.
    // The spin adds to the glide every frame, but not while a pointer holds the view.
    const creeping = !(this.controls.autoRotate && !this.gesture) && this.creeping();
    if (creeping && !this.gesture) stopGlide(this.controls);
    this.controls.dampingFactor = creeping && this.gesture ? 1 : eased;
    const moved = this.controls.update();
    this.controls.dampingFactor = eased;
    // Zoomed in close, three reports a glide's last frames only every few, as each moves the camera too little; it
    // ends all the same, once what is left creeps.
    const left = glideLeft(this.controls);
    const gliding = left !== null && (left.angle > 0 || left.pan > 0);
    const moving = moved || turning || gliding || now - this.movedAt < MOVING_FOR_MS;
    if (this.drawnMoving && !moving) this.dirty = true;
    const working = this.work(moving);
    if (!moved && !this.dirty) {
      if (moving || working) return;
      this.stopLoop();
      return;
    }
    // Before the hooks, which may ask for another frame.
    this.dirty = false;
    this.updateCameraTied();
    this.beforeDraw(moving);
    const drawn = this.draw(moving);
    this.drawnMoving = moving;
    this.afterDraw(moving ? drawn : null);
    this.framesDrawn++;
    const orientation = this.camera.quaternion;
    if (!orientation.equals(this.heardOrientation)) {
      this.heardOrientation.copy(orientation);
      for (const listener of this.viewListeners) listener(orientation);
    }
  }

  private stopLoop(): void {
    this.renderer.setAnimationLoop(null);
    this.looping = false;
    this.lastFrameAt = null;
    this.framesDrawn = 0;
  }

  /** OrbitControls' damping for the time since the last turn of the loop: the glide lasts as long at any frame rate. */
  private easing(now: number): number {
    if (this.lastFrameAt !== null) {
      this.frameMs = Math.min(Math.max(now - this.lastFrameAt, FRAME_MS.min), FRAME_MS.max);
    }
    this.lastFrameAt = now;
    return 1 - Math.exp(-this.frameMs / GLIDE_MS);
  }

  /**
   * Whether what is left of OrbitControls' glide would move the view by under `GLIDE_STOP_PX`. Three glides on until
   * the camera moves by a nanometre a frame: a second or more of creep too small to see, which holds back the frames
   * drawn still.
   */
  private creeping(): boolean {
    const left = glideLeft(this.controls);
    if (!left || (left.angle === 0 && left.pan === 0)) return false;
    if (this.bounds.isEmpty()) return true;
    const { center, radius } = this.bounds.getBoundingSphere(sphere);
    let reach = center.distanceTo(this.controls.target) + radius;
    let pixel = this.cssPixelNear(this.bounds);
    if (this.projection === 'perspective') {
      // The camera can be inside the bounds, where the nearest point is at the near plane. Taken a quarter of the way
      // to the target, within 1.25 times that way of it: what is nearer still, so close to the eye, may move a few
      // pixels more as the glide ends.
      const d = this.controls.getDistance();
      reach = Math.min(reach, 1.25 * d);
      pixel = this.cssPixelNear(this.bounds, Math.max(0.25 * d, this.perspective.near));
    }
    return !((left.angle * reach + left.pan) / pixel >= GLIDE_STOP_PX);
  }

  private stepTurn(): void {
    const turn = this.turn;
    if (!turn) return;
    const t = Math.min(1, (performance.now() - turn.start) / TURN_MS);
    turnCamera(this.controls, turn.from, turn.to, t);
    if (t === 1) this.turn = null;
    this.dirty = true;
  }

  /**
   * Work the content does a little of on each turn of the loop, drawn or not, and less of while the camera moves; true
   * while some is left, which keeps the loop turning. What it changes on show it asks a frame for (`invalidate`).
   */
  protected work(_moving: boolean): boolean {
    return false;
  }

  /** Before a frame is drawn, with whether the camera is moving: what the content draws may depend on it. */
  protected beforeDraw(_moving: boolean): void {}

  /** After a frame is drawn: how, through the composer, where the camera moved; null where it was still. */
  protected afterDraw(_moved: MovingFrame | null): void {}

  /** After what a frame costs changed: the view's size, the look, or the passes. */
  protected frameChanged(): void {}

  /** The GPU took the context, and what was uploaded with it. */
  protected contextLost(): void {}

  /** After three rebuilt what it kept the sources of. */
  protected contextRestored(): void {}

  private composing(): boolean {
    return this.options.composeAlways === true || this.ao || this.look.bloom === true;
  }

  /** A frame, cut down as `motionFrame` says where the camera moves: how it was drawn, or null without the composer. */
  private draw(moving = false): MovingFrame | null {
    const main = this.main;
    if (!main || !this.composing()) {
      this.renderer.render(this.scene, this.camera);
      return null;
    }
    const cut = moving ? this.motionFrame : null;
    const bloom = this.look.bloom === true;
    if (cut && (cut.scale < 1 || !cut.antialias) && !bloom) return this.drawMotion(cut);
    const ao = this.ao && (cut?.ao ?? true);
    setPasses(main, ao, bloom);
    composeFrame(main);
    return { ao, scale: 1, antialias: true };
  }

  /** A moving frame drawn through a pipeline of its own, which the output pass scales up onto the canvas. */
  private drawMotion(cut: MovingFrame): MovingFrame {
    if (this.movingPipeline?.antialias !== cut.antialias) this.dropMovingPipeline();
    this.movingPipeline ??= this.buildPipeline(cut);
    const p = this.movingPipeline;
    if (p.scale !== cut.scale) {
      p.scale = cut.scale;
      this.fitPipeline(p);
    }
    const ao = this.ao && cut.ao;
    setPasses(p, ao, false);
    composeFrame(p);
    return { ...cut, ao };
  }

  /** Free the pipeline of moving frames' own, which they no longer draw through. */
  protected dropMovingPipeline(): void {
    if (this.movingPipeline) disposePipeline(this.movingPipeline);
    this.movingPipeline = null;
  }

  protected invalidate(): void {
    this.dirty = true;
    if (this.looping || this.disposed || !this.onScreen) return;
    this.looping = true;
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private screenChanged(on: boolean): void {
    this.onScreen = on;
    this.checkSeen();
    if (on) this.invalidate();
    else this.stopLoop();
  }

  // Hidden, a page draws nothing though its loop stays on: the GPU idles, and wakes up over the first frames again.
  private onVisibility = (): void => {
    if (document.hidden) this.framesDrawn = 0;
    this.checkSeen();
  };

  private checkSeen = (): void => {
    if (this.seenOnce || !this.onScreen || document.hidden) return;
    this.seenOnce = true;
    for (const listener of this.seenListeners) listener();
    this.seenListeners.clear();
  };

  /**
   * Resolves once the view has been on screen in a page on show, at once from then on: a tab opened in the background,
   * or a view scrolled past unseen, waits.
   */
  seen(): Promise<void> {
    if (this.seenOnce) return Promise.resolve();
    return new Promise((resolve) => this.seenListeners.add(resolve));
  }

  /**
   * For a viewer that always composes (`composeAlways`): compile the look's shaders before the content's geometry
   * arrives, for the composer's target, as tone mapping and the output colour space differ between it and the canvas.
   * Then draw one frame with `placeholder`, a degenerate triangle with the content's vertex attributes: Metal builds its
   * pipelines on the first draw, and `compileAsync` leaves out the composer's passes.
   */
  async warmUp(placeholder: THREE.BufferGeometry): Promise<void> {
    const look = this.look;
    const surface = new THREE.Mesh(placeholder, look.material);
    const outline = look.outline && new THREE.Mesh(placeholder, look.outline);
    surface.frustumCulled = false;
    this.chunks.add(surface);
    if (outline) {
      outline.frustumCulled = false;
      this.outlines.add(outline);
    }
    const target = this.ensureComposer().composer.renderTarget2;
    const previous = this.renderer.getRenderTarget();
    let compiled: Promise<unknown>;
    try {
      this.renderer.setRenderTarget(target);
      compiled = this.renderer.compileAsync(this.scene, this.camera);
    } finally {
      this.renderer.setRenderTarget(previous);
    }
    try {
      await compiled;
      if (!this.disposed) this.draw();
    } finally {
      this.chunks.remove(surface);
      if (outline) this.outlines.remove(outline);
      this.invalidate();
    }
  }

  private onContextLost = (): void => this.contextLost();

  // three rebuilds what it kept the sources of; the environment was drawn on the GPU, and went with the context.
  private onContextRestored = (): void => {
    if (this.environment) {
      this.environment.dispose();
      this.environment = null;
      this.applyLook();
    }
    this.invalidate();
    this.contextRestored();
  };

  /**
   * For a viewer that always composes (`composeAlways`): draw `objects`, which must be in the scene, once where frames
   * are drawn, writing no pixel. three uploads their buffers and builds their programs, and the driver does its
   * first-draw work (ANGLE's vertex conversions, its lazily made storage), ahead of the frame that shows them.
   *
   * They are drawn into a target of a pixel, of the formats the scene is drawn into, which is what the GPU's pipelines
   * are built for: three resolves a multisampled target after each draw, which Direct3D likely does whole, whatever the
   * scissor.
   */
  protected drawUnseen(objects: THREE.Object3D[]): void {
    const renderer = this.renderer;
    const { color, depth } = renderer.state.buffers;
    const camera = this.camera;
    const layers = camera.layers.mask;
    const saved = objects.map((o) => ({ mask: o.layers.mask, culled: o.frustumCulled }));
    const autoClear = renderer.autoClear;
    const previous = renderer.getRenderTarget();
    const target = this.ensureComposer().composer.renderTarget2;
    try {
      for (const o of objects) {
        o.layers.set(UNSEEN_LAYER);
        o.frustumCulled = false;
      }
      camera.layers.set(UNSEEN_LAYER);
      renderer.autoClear = false;
      color.setMask(false);
      color.setLocked(true);
      depth.setMask(false);
      depth.setLocked(true);
      renderer.setRenderTarget(this.pixelTarget(target));
      renderer.render(this.scene, camera);
    } finally {
      color.setLocked(false);
      color.setMask(true);
      depth.setLocked(false);
      depth.setMask(true);
      renderer.autoClear = autoClear;
      renderer.setRenderTarget(previous);
      camera.layers.mask = layers;
      objects.forEach((o, i) => {
        o.layers.mask = saved[i].mask;
        o.frustumCulled = saved[i].culled;
      });
    }
  }

  /** A pixel's target of the formats of `target`, the one the scene is drawn into (`drawUnseen`). */
  private pixelTarget(target: THREE.WebGLRenderTarget): THREE.WebGLRenderTarget {
    this.unseenTarget ??= new THREE.WebGLRenderTarget(1, 1, {
      type: target.texture.type,
      samples: target.samples,
      depthTexture: target.depthTexture ? new THREE.DepthTexture(1, 1) : null,
      resolveDepthBuffer: false,
    });
    return this.unseenTarget;
  }

  private onControlsChange = (): void => {
    // A wheel or a pinch zooms inside OrbitControls' own handler, which leaves the next frame's update nothing to do.
    if (this.gesture) this.movedAt = performance.now();
    followScreenUp(this.controls);
    this.invalidate();
    this.updatePixelScale();
  };

  /** Drop what is left of a turn to an axis and of OrbitControls' easing, so that a view set now stays put. */
  private stopCamera(): void {
    this.turn = null;
    stopGlide(this.controls);
  }

  // A gesture takes the camera over from a turn to an axis, keeping OrbitControls' easing.
  private onControlsStart = (): void => {
    this.turn = null;
    this.gesture = true;
  };

  // A spin held off by a still pointer can have let the loop stop by the time the pointer is let go.
  private onControlsEnd = (): void => {
    this.gesture = false;
    this.invalidate();
  };

  private onWheel = (e: WheelEvent): void => {
    if (e.ctrlKey || document.fullscreenElement?.contains(this.container)) return;
    e.stopPropagation();
    for (const listener of this.wheelListeners) listener();
  };

  /** How close the view is: the orbit distance, or for the orthographic camera the perspective distance with its view. */
  private reach(distance: number): number {
    if (this.projection === 'perspective') return distance;
    const o = this.orthographic;
    return distanceFor(o.top / o.zoom, FOV);
  }

  /**
   * Per-frame state that follows the camera: the clip range and fog ranges tied
   * to the orbit distance, and the depths the depth-coded look's colours span.
   */
  private updateCameraTied(): void {
    const camera = this.camera;
    const target = this.controls.target;
    const d = camera.position.distanceTo(target);
    const reach = this.reach(d);
    const radius = orbitRadius(this.bounds) || 50;
    // A near plane fixed at the framing distance would cut fibres tens of µm away on a mm-scale cell.
    const { near, far } =
      this.projection === 'perspective'
        ? clipRange(d, camera.position.length(), radius)
        : orthoClip(d, radius + target.length());
    if (near !== camera.near || far !== camera.far) {
      camera.near = near;
      camera.far = far;
      camera.updateProjectionMatrix();
    }
    const fog = fogRange(d, reach);
    for (const l of this.looks) {
      if (l.fog) {
        l.fog.near = fog.near;
        l.fog.far = fog.far;
      }
    }
    // Only the surface is drawn by depth, and only by the look that colours by it.
    if (this.depthSample !== null && this.look.depthRange) {
      const dir = camera.getWorldDirection(this.viewDir);
      const span = depthSpan(this.depthSample, camera.position, dir, d, reach);
      setDepthRange(span.near, span.far);
    }
  }

  protected applyLook(): void {
    this.paintLook();
  }

  private paintLook(): void {
    const look = this.look;
    for (const l of this.looks) if (l.rig) l.rig.visible = l === look;
    this.chunks.traverse((m) => {
      if (m instanceof THREE.Mesh) m.material = look.material;
    });
    // An outline is a solid silhouette, which would stand behind the wires.
    this.outlines.visible = this.meshVisible && look.outline !== undefined && !this.wireframe;
    this.renderer.toneMapping =
      look.toneMapped === false ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    const outline = look.outline;
    if (outline) {
      this.outlines.traverse((m) => {
        if (m instanceof THREE.Mesh) m.material = outline;
      });
    }
    if (look.env) this.environment ??= makeEnvironment(this.renderer);
    this.scene.environment = look.env ? this.environment : null;
    this.scene.fog = look.fog ?? null;
    this.invalidate();
  }

  private applyBackground(): void {
    this.container.style.background = backgroundCss(this.look, this.dark);
    for (const l of this.looks) {
      // Fog fades towards the (flat) background of its look.
      if (l.fog) l.fog.color.set(l.background[this.dark ? 'dark' : 'light'][1]);
      l.onTheme?.(this.dark, this.surfaceColor);
    }
    this.invalidate();
  }

  private resize(): void {
    if (this.fitCanvas()) this.frameChanged();
  }

  /** Size the canvas, the cameras and the passes to the container; false where it is hidden. */
  private fitCanvas(): boolean {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    // Hidden (display: none): keep the last size rather than draw into a point.
    if (w === 0 || h === 0) return false;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.perspective.aspect = w / h;
    this.perspective.updateProjectionMatrix();
    const o = this.orthographic;
    o.left = -o.top * (w / h);
    o.right = o.top * (w / h);
    o.updateProjectionMatrix();
    for (const p of this.pipelines) this.fitPipeline(p);
    this.invalidate();
    this.updatePixelScale();
    return true;
  }

  /**
   * Size `p` to the canvas, at its fraction of the resolution. AO runs at a fraction of that, its radius following, and
   * bloom at CSS resolution: both are upsampled when blended.
   */
  private fitPipeline(p: Pipeline): void {
    const { width: w, height: h } = this;
    const pr = this.renderer.getPixelRatio() * p.scale;
    // The composer sizes every pass to its own size, before the occlusion and bloom take theirs.
    p.composer.setPixelRatio(pr);
    p.composer.setSize(w, h);
    const aoWidth = Math.max(1, Math.round(w * pr * AO_SCALE));
    const aoHeight = Math.max(1, Math.round(h * pr * AO_SCALE));
    p.gtao.setSize(aoWidth, aoHeight);
    p.depthNormals?.resize(aoWidth, aoHeight);
    p.bloom?.setSize(w, h);
    // The shader counts a screen-space radius in hundreds of pixels of the AO target.
    const radius = (AO_RADIUS_CSS * pr * AO_SCALE) / 100;
    p.gtao.updateGtaoMaterial({ radius, thickness: radius });
  }

  private updatePixelScale(): void {
    const o = this.orthographic;
    const scale =
      this.projection === 'orthographic'
        ? orthoPixelScale(o.top, o.bottom, o.zoom, this.height)
        : null;
    if (scale === this.pixelScale) return;
    this.pixelScale = scale;
    for (const listener of this.pixelScaleListeners) listener(scale);
  }

  // ---------------------------------------------------------------------------
  // View options

  setWireframe(v: boolean): void {
    this.wireframe = v;
    for (const l of this.looks) {
      const m = l.material as THREE.Material & { wireframe?: boolean };
      if ('wireframe' in m) m.wireframe = v;
    }
    this.applyLook();
  }

  setDark(dark: boolean): void {
    this.dark = dark;
    this.applyBackground();
  }

  /** The colour of a surface without vertex colours, which each look draws as `plainColor` says. */
  setSurfaceColor(color: ThemeColors): void {
    this.surfaceColor = color;
    this.applyBackground();
  }

  /** Switch to the look `id`; what it turns on with it (`Look.bumps`, `Look.ao`) is the caller's to apply. */
  setLook(id: string): void {
    const look = this.looks.find((l) => l.id === id);
    if (!look) throw new Error(`unknown look "${id}"`);
    this.look = look;
    if (look.bloom) this.ensureComposer();
    this.applyLook();
    this.applyBackground();
    this.frameChanged();
  }

  setSpin(on: boolean): void {
    this.controls.autoRotate = on;
    this.invalidate();
  }

  /** Where the ambient occlusion takes its depth from (`SceneViewerOptions.aoDepth`), to compare the two. */
  setAODepth(depth: AODepth): void {
    if ((this.options.aoDepth ?? 'own-pass') === depth) return;
    this.options = { ...this.options, aoDepth: depth };
    if (this.main) {
      this.disposeComposer();
      this.ensureComposer();
      this.invalidate();
    }
    this.frameChanged();
  }

  /** Screen-space ambient occlusion (GTAO). */
  setAO(on: boolean): void {
    this.ao = on;
    if (on) this.ensureComposer();
    this.invalidate();
    this.frameChanged();
  }

  private ensureComposer(): Pipeline {
    this.main ??= this.buildPipeline(null);
    return this.main;
  }

  /**
   * Render pass → GTAO → bloom → output, for still frames, or for moving ones cut down as `cut`: at its fraction of the
   * resolution, and without bloom. The middle two are set for each frame (`setPasses`).
   */
  private buildPipeline(cut: MovingFrame | null): Pipeline {
    const { scale, antialias } = cut ?? { scale: 1, antialias: true };
    const w = this.width,
      h = this.height;
    // The scene is drawn into renderTarget2 (see draw), multisampled like the canvas: without, a fibre thinner than a
    // pixel breaks into dashes whenever a pass is on. The other buffer only takes full-screen passes, and only the
    // ambient occlusion from the main pass's depth reads the scene's depth back.
    const composer = makeComposer(this.renderer, antialias);
    const target = composer.renderTarget2;
    if (this.options.aoDepth === 'main-pass') {
      target.depthTexture = new THREE.DepthTexture(target.width, target.height);
    }
    const render = new RenderPass(this.scene, this.camera);
    composer.addPass(render);
    const gtao = new GTAOPass(this.surfaces, this.camera, w, h);
    gtao.output = GTAOPass.OUTPUT.Default;
    // three's GTAO scales its depth range by the screen-space radius (distanceFalloffToUse) but tests the unscaled
    // `thickness`: test the scaled one, so that `thickness` too is in hundreds of pixels at each fragment's depth.
    const ao = gtao.gtaoMaterial;
    const unscaled = ao.fragmentShader;
    ao.fragmentShader = unscaled.replaceAll(
      'abs(viewDelta.z) < thickness',
      'abs(viewDelta.z) < distanceFalloffToUse'
    );
    if (ao.fragmentShader === unscaled) {
      console.warn('GTAOShader has changed: the AO depth range no longer follows the zoom');
    }
    // GTAO also takes the way to the eye as -viewPos, which holds for a perspective camera only. For an orthographic
    // one it is +z from anywhere, and part of the cell can be behind the camera (`orthoClip`): there -viewPos turns
    // away from the eye, and GTAO finds the surface occluded all round, black.
    const perspectiveOnly = ao.fragmentShader;
    ao.fragmentShader = perspectiveOnly.replace(
      'vec3 viewDir = normalize(-viewPos.xyz);',
      'vec3 viewDir = PERSPECTIVE_CAMERA == 1 ? normalize(-viewPos.xyz) : vec3(0.0, 0.0, 1.0);'
    );
    if (ao.fragmentShader === perspectiveOnly) {
      console.warn(
        'GTAOShader has changed: an orthographic view may occlude what lies behind the camera'
      );
    }
    // A radius in pixels of the AO target (`fitPipeline`), so the effect follows the zoom: neighbouring fibres shade
    // each other close up, dense regions darken from afar. A sample occludes within a depth as long as the radius is
    // wide.
    gtao.updateGtaoMaterial({
      distanceExponent: 1,
      scale: 1.5,
      samples: 16,
      distanceFallOff: 1,
      screenSpaceRadius: true,
    });
    gtao.updatePdMaterial({
      lumaPhi: 10,
      depthPhi: 2,
      normalPhi: 3,
      radius: 4,
      radiusExponent: 1,
      rings: 2,
      samples: 16,
    });
    gtao.blendIntensity = 1;
    let depthNormals: DepthNormalsPass | null = null;
    if (target.depthTexture) {
      depthNormals = new DepthNormalsPass(target.depthTexture, this.camera);
      composer.addPass(depthNormals);
      gtao.setGBuffer(target.depthTexture, depthNormals.texture);
    } else if (this.options.surface.includes('radius')) {
      // The pass draws its own normals and depth: with the bumps and the width floor in them the occlusion follows
      // the surface as drawn. The normals tilt per vertex, as the depth it reconstructs the surface from is displaced:
      // tilted per pixel, they would disagree with it and occlude themselves.
      withDisplacement(gtao.normalMaterial, { perFragment: false });
    }
    composer.addPass(gtao);
    let bloom: UnrealBloomPass | null = null;
    if (!cut) {
      bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.65, 0.5, 0.2);
      composer.addPass(bloom);
    }
    const output = aoOutputPass();
    composer.addPass(output);
    const p: Pipeline = { composer, render, gtao, depthNormals, bloom, output, scale, antialias };
    this.fitPipeline(p);
    return p;
  }

  private get pipelines(): Pipeline[] {
    return [this.main, this.movingPipeline].filter((p) => p !== null);
  }

  private disposeComposer(): void {
    for (const p of this.pipelines) disposePipeline(p);
    this.main = null;
    this.movingPipeline = null;
    this.unseenTarget?.dispose();
    this.unseenTarget = null;
  }

  /** The passes that draw from the camera, onto the one in use. GTAO reconstructs positions differently per projection. */
  private retargetPasses(): void {
    const camera = this.camera;
    const perspective = this.projection === 'perspective' ? 1 : 0;
    for (const p of this.pipelines) {
      p.render.camera = camera;
      if (p.depthNormals) p.depthNormals.camera = camera;
      p.gtao.camera = camera;
      for (const m of [p.gtao.gtaoMaterial, p.gtao.depthRenderMaterial]) {
        m.defines.PERSPECTIVE_CAMERA = perspective;
        m.needsUpdate = true;
      }
    }
  }

  /** The device pixels moving frames are drawn into through a pipeline of their own, 0 without one. */
  protected movingPixels(): number {
    if (!this.movingPipeline) return 0;
    const { width, height } = this.movingPipeline.composer.renderTarget2;
    return width * height;
  }

  /** µm per CSS pixel in the orthographic view, null in perspective. */
  get currentPixelScale(): number | null {
    return this.pixelScale;
  }

  /**
   * µm per CSS pixel at the point of `box` nearest the camera, or at `nearest` from it if that is farther: the same
   * everywhere in the orthographic view.
   */
  protected cssPixelNear(box: THREE.Box3, nearest = this.perspective.near): number {
    if (this.projection === 'orthographic') {
      const o = this.orthographic;
      return orthoPixelScale(o.top, o.bottom, o.zoom, this.height);
    }
    const camera = this.perspective;
    const d = Math.max(box.distanceToPoint(camera.position), nearest);
    return (2 * halfHeightAt(d, FOV)) / this.height;
  }

  /**
   * Switch between the orthographic and the perspective camera, keeping the target, the direction and how large the
   * cell is at the target.
   */
  setProjection(projection: Projection): void {
    if (projection === this.projection) return;
    const from = this.camera;
    const target = this.controls.target;
    const offset = from.position.clone().sub(target);
    const d = offset.length();
    const o = this.orthographic;
    this.projection = projection;
    const to = this.camera;
    if (projection === 'orthographic') {
      const half = halfHeightAt(d, FOV);
      o.top = half;
      o.bottom = -half;
      o.left = -half * (this.width / this.height);
      o.right = half * (this.width / this.height);
      o.zoom = 1;
      to.position.copy(from.position);
    } else {
      to.position
        .copy(target)
        .addScaledVector(offset.normalize(), distanceFor(o.top / o.zoom, FOV));
    }
    to.up.copy(from.up);
    to.quaternion.copy(from.quaternion);
    to.updateProjectionMatrix();
    for (const l of this.looks) if (l.rig) to.add(l.rig);
    this.controls.object = to;
    this.retargetPasses();
    this.controls.update();
    this.invalidate();
    this.updatePixelScale();
  }

  resetView(): void {
    // Orbit the origin (a morphology's soma, an EM mesh's centre), as close as lets the whole cell in: the side that
    // reaches farthest on screen comes to within a margin of the edge.
    const aspect = this.width / this.height;
    const tanY = Math.tan((FOV * Math.PI) / 360);
    const box = this.bounds,
      corners: number[] = [];
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) corners.push(x, y, z);
    }
    const points = this.fitPoints ?? corners;
    const r = orbitRadius(this.bounds) || 50;
    const camera = this.camera;
    if (this.projection === 'perspective') {
      const dist = fitDistance(points, tanY * aspect, tanY, FIT_FILL, r * 0.02) || r / tanY;
      camera.position.set(0, 0, dist);
    } else {
      const o = this.orthographic;
      const half = fitHalfHeight(points, aspect, FIT_FILL) || r;
      o.top = half;
      o.bottom = -half;
      o.left = -half * aspect;
      o.right = half * aspect;
      o.zoom = 1;
      o.updateProjectionMatrix();
      // Where the perspective camera would stand for this view, outside the cell.
      camera.position.set(0, 0, Math.max(distanceFor(half, FOV), r * 1.05));
    }
    camera.up.set(0, 1, 0);
    this.stopCamera();
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.invalidate();
    this.updatePixelScale();
  }

  /** Turn the camera about the target to view the cell from the tip of an axis, or from the opposite tip when it already does. */
  viewAlong(axis: Axis, sign: Sign): void {
    this.stopCamera();
    const from = this.camera.quaternion.clone();
    this.turn = { from, to: axisView(axis, sign, from), start: performance.now() };
    this.invalidate();
  }

  /** The camera's orientation now and whenever it turns. */
  onViewChange(listener: (orientation: Readonly<THREE.Quaternion>) => void): () => void {
    this.viewListeners.add(listener);
    listener(this.camera.quaternion);
    return () => this.viewListeners.delete(listener);
  }

  onPixelScaleChange(listener: (scale: number | null) => void): () => void {
    this.pixelScaleListeners.add(listener);
    return () => this.pixelScaleListeners.delete(listener);
  }

  /** A wheel turned outside fullscreen without Ctrl, which scrolls the page instead of zooming. */
  onWheelWithoutCtrl(listener: () => void): () => void {
    this.wheelListeners.add(listener);
    return () => this.wheelListeners.delete(listener);
  }
}
