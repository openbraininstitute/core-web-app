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
import { clipRange, depthSpan, fitDistance, orbitRadius } from './framing';
import { type Axis, axisView, type Sign } from './gizmo';
import {
  backgroundCss,
  createLooks,
  DEFAULT_LOOK,
  type Look,
  makeEnvironment,
  type SurfaceAttribute,
  setDepthRange,
  withDisplacement,
} from './looks';
import { followScreenUp, stopGlide, turnCamera } from './rotation';

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
/** The layer of what `drawUnseen` draws, which the lights are on as well. */
const UNSEEN_LAYER = 31;
/**
 * How long the view still counts as moving once it stopped, ms. A wheel notch moves it in a single frame: without the
 * wait, a content that draws less while the view moves would draw in full between two notches.
 */
const MOVING_FOR_MS = 200;

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
  protected wireframe = false;
  protected dark = false;
  private ao = false;
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private gtao: GTAOPass | null = null;
  private bloom: UnrealBloomPass | null = null;
  /** The canvas's size in CSS pixels, as `resize` left it. */
  private width = 1;
  private height = 1;
  private viewDir = new THREE.Vector3();
  /** Set whenever something other than the camera changed; the loop only renders when needed. */
  private dirty = true;
  /** The animation loop stops once nothing moves and nothing has changed; `invalidate` starts it again. */
  private looping = false;
  /** When the camera last moved, and whether the last frame was drawn as moving: a still one is owed after it. */
  private movedAt = Number.NEGATIVE_INFINITY;
  private drawnMoving = false;
  private disposed = false;
  private resizeObserver: ResizeObserver;
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
    // Transparent canvas over CSS backgrounds: gradients stay untouched by tone mapping and post-processing.
    this.renderer = new THREE.WebGLRenderer({ antialias: !options.composeAlways, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
   * once a frame has been drawn still after the camera stopped.
   */
  private frame(): void {
    const turning = this.turn !== null;
    this.stepTurn();
    const moved = this.controls.update();
    const now = performance.now();
    if (moved || turning) this.movedAt = now;
    const moving = now - this.movedAt < MOVING_FOR_MS;
    if (this.drawnMoving && !moving) this.dirty = true;
    if (!moved && !this.dirty) {
      if (moving) return;
      this.renderer.setAnimationLoop(null);
      this.looping = false;
      return;
    }
    // Before the hooks, which may ask for another frame.
    this.dirty = false;
    this.updateCameraTied();
    this.beforeDraw(moving);
    this.draw();
    this.drawnMoving = moving;
    this.afterDraw();
    const orientation = this.camera.quaternion;
    if (!orientation.equals(this.heardOrientation)) {
      this.heardOrientation.copy(orientation);
      for (const listener of this.viewListeners) listener(orientation);
    }
  }

  private stepTurn(): void {
    const turn = this.turn;
    if (!turn) return;
    const t = Math.min(1, (performance.now() - turn.start) / TURN_MS);
    turnCamera(this.controls, turn.from, turn.to, t);
    if (t === 1) this.turn = null;
    this.dirty = true;
  }

  /** Before a frame is drawn, with whether the camera is moving: what the content draws may depend on it. */
  protected beforeDraw(_moving: boolean): void {}

  protected afterDraw(): void {}

  /** After what a frame costs changed: the view's size, the look, or the passes. */
  protected frameChanged(): void {}

  /** The GPU took the context, and what was uploaded with it. */
  protected contextLost(): void {}

  /** After three rebuilt what it kept the sources of. */
  protected contextRestored(): void {}

  private composing(): boolean {
    return this.options.composeAlways === true || this.ao || this.look.bloom === true;
  }

  private draw(): void {
    const c = this.composer;
    if (c && this.composing()) {
      // The scene goes into the read buffer, which must be the multisampled one; the passes enabled may swap the two
      // an odd number of times per frame.
      if (c.readBuffer !== c.renderTarget2) c.swapBuffers();
      c.render();
    } else this.renderer.render(this.scene, this.camera);
  }

  protected invalidate(): void {
    this.dirty = true;
    if (this.looping || this.disposed) return;
    this.looping = true;
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /**
   * Compile the look's shaders before the content's geometry arrives, for the target its frames are drawn into: tone
   * mapping and the output colour space differ between the composer's target and the canvas. Then draw one frame with
   * `placeholder`, a degenerate triangle with the content's vertex attributes: Metal builds its pipelines on the first
   * draw, and `compileAsync` leaves out the composer's passes.
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
    if (this.composing()) this.ensureComposer();
    const previous = this.renderer.getRenderTarget();
    let compiled: Promise<unknown>;
    try {
      this.renderer.setRenderTarget(
        this.composing() ? (this.composer?.renderTarget2 ?? null) : null
      );
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
   * Draw `objects`, which must be in the scene, once where frames are drawn, writing no pixel: three uploads their
   * buffers and builds their programs, and the driver does its first-draw work (ANGLE's vertex conversions, its lazily
   * made storage), ahead of the frame that shows them.
   */
  protected drawUnseen(objects: THREE.Object3D[]): void {
    const renderer = this.renderer;
    const { color, depth } = renderer.state.buffers;
    const camera = this.camera;
    const layers = camera.layers.mask;
    const saved = objects.map((o) => ({ mask: o.layers.mask, culled: o.frustumCulled }));
    const autoClear = renderer.autoClear;
    const previous = renderer.getRenderTarget();
    if (this.composing()) this.ensureComposer();
    const target = this.composing() ? (this.composer?.renderTarget2 ?? null) : null;
    const scissor = target
      ? { box: target.scissor.clone(), test: target.scissorTest }
      : { box: renderer.getScissor(new THREE.Vector4()), test: renderer.getScissorTest() };
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
      // Its resolve is scissored too.
      if (target) {
        target.scissor.set(0, 0, 1, 1);
        target.scissorTest = true;
      } else {
        renderer.setScissor(0, 0, 1, 1);
        renderer.setScissorTest(true);
      }
      renderer.setRenderTarget(target);
      renderer.render(this.scene, camera);
    } finally {
      color.setLocked(false);
      color.setMask(true);
      depth.setLocked(false);
      depth.setMask(true);
      renderer.autoClear = autoClear;
      if (target) {
        target.scissor.copy(scissor.box);
        target.scissorTest = scissor.test;
      } else {
        renderer.setScissor(scissor.box);
        renderer.setScissorTest(scissor.test);
      }
      renderer.setRenderTarget(previous);
      camera.layers.mask = layers;
      objects.forEach((o, i) => {
        o.layers.mask = saved[i].mask;
        o.frustumCulled = saved[i].culled;
      });
    }
  }

  private onControlsChange = (): void => {
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
  };

  // A spin held off by a still pointer can have let the loop stop by the time the pointer is let go.
  private onControlsEnd = (): void => this.invalidate();

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
    // Only the surface is drawn by depth.
    if (this.depthSample !== null) {
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
    if (this.bloom) this.bloom.enabled = look.bloom === true;
    this.invalidate();
  }

  private applyBackground(): void {
    this.container.style.background = backgroundCss(this.look, this.dark);
    for (const l of this.looks) {
      // Fog fades towards the (flat) background of its look.
      if (l.fog) l.fog.color.set(l.background[this.dark ? 'dark' : 'light'][1]);
      l.onTheme?.(this.dark);
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
    this.composer?.setSize(w, h);
    this.sizeEffects(w, h);
    this.invalidate();
    this.updatePixelScale();
    return true;
  }

  /** AO runs at a fraction of the device resolution; bloom at CSS resolution. Both are upsampled when blended. */
  private sizeEffects(w: number, h: number): void {
    const pr = this.renderer.getPixelRatio();
    this.gtao?.setSize(
      Math.max(1, Math.round(w * pr * AO_SCALE)),
      Math.max(1, Math.round(h * pr * AO_SCALE))
    );
    this.bloom?.setSize(w, h);
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
    if (this.composer) {
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
    if (this.gtao) this.gtao.enabled = on;
    this.invalidate();
    this.frameChanged();
  }

  /** Render pass → GTAO → bloom → output; the middle two are toggled per state and look. */
  private ensureComposer(): void {
    if (this.composer) return;
    const w = this.width,
      h = this.height;
    const composer = new EffectComposer(this.renderer);
    // The scene is drawn into renderTarget2 (see draw), multisampled like the canvas: without, a fibre thinner than a
    // pixel breaks into dashes whenever a pass is on. The other buffer only takes full-screen passes, and only the
    // ambient occlusion from the main pass's depth reads the scene's depth back.
    const target = composer.renderTarget2;
    const mainDepth = this.options.aoDepth === 'main-pass';
    target.samples = 4;
    target.resolveDepthBuffer = mainDepth;
    if (mainDepth) target.depthTexture = new THREE.DepthTexture(target.width, target.height);
    composer.renderTarget1.depthBuffer = false;
    const renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(renderPass);
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
    // Radius in pixels of the AO target so the effect follows the zoom: neighbouring fibres shade each other close
    // up, dense regions darken from afar. The shader counts a screen-space radius in hundreds of pixels. A sample
    // occludes within a depth as long as the radius is wide.
    const radius = (AO_RADIUS_CSS * this.renderer.getPixelRatio() * AO_SCALE) / 100;
    gtao.updateGtaoMaterial({
      radius,
      distanceExponent: 1,
      thickness: radius,
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
    gtao.enabled = this.ao;
    if (target.depthTexture) gtao.setGBuffer(target.depthTexture);
    else if (this.options.surface.includes('radius')) {
      // The pass draws its own normals and depth: with the bumps and the width floor in them the occlusion follows
      // the surface as drawn. The normals tilt per vertex, as the depth it reconstructs the surface from is displaced:
      // tilted per pixel, they would disagree with it and occlude themselves.
      withDisplacement(gtao.normalMaterial, { perFragment: false });
    }
    composer.addPass(gtao);
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.65, 0.5, 0.2);
    bloom.enabled = this.look.bloom === true;
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composer.setPixelRatio(this.renderer.getPixelRatio());
    composer.setSize(w, h);
    this.composer = composer;
    this.renderPass = renderPass;
    this.gtao = gtao;
    this.bloom = bloom;
    this.sizeEffects(w, h);
  }

  private disposeComposer(): void {
    this.gtao?.dispose();
    this.bloom?.dispose();
    this.composer?.dispose();
    this.composer = null;
    this.renderPass = null;
    this.gtao = null;
    this.bloom = null;
  }

  /** The passes that draw from the camera, onto the one in use. GTAO reconstructs positions differently per projection. */
  private retargetPasses(): void {
    const camera = this.camera;
    if (this.renderPass) this.renderPass.camera = camera;
    const gtao = this.gtao;
    if (!gtao) return;
    gtao.camera = camera;
    const perspective = this.projection === 'perspective' ? 1 : 0;
    for (const m of [gtao.gtaoMaterial, gtao.depthRenderMaterial]) {
      m.defines.PERSPECTIVE_CAMERA = perspective;
      m.needsUpdate = true;
    }
  }

  /** µm per CSS pixel in the orthographic view, null in perspective. */
  get currentPixelScale(): number | null {
    return this.pixelScale;
  }

  /** µm per CSS pixel at the point of `box` nearest the camera: the same everywhere in the orthographic view. */
  protected cssPixelNear(box: THREE.Box3): number {
    if (this.projection === 'orthographic') {
      const o = this.orthographic;
      return orthoPixelScale(o.top, o.bottom, o.zoom, this.height);
    }
    const camera = this.perspective;
    const d = Math.max(box.distanceToPoint(camera.position), camera.near);
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
