import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { fogRange } from './camera';
import { DepthNormalsPass } from './depth-normals-pass';
import { depthSpan } from './framing';
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
import { MAX_PIXEL_RATIO, type MovingFrame, SceneView } from './scene-view';

/**
 * Ambient occlusion is computed at this fraction of the device resolution.
 * It is a low-frequency effect, and the pass costs several taps per pixel.
 */
const AO_SCALE = 0.5;
/** Screen-space AO radius in CSS pixels; it follows the zoom, not the geometry. */
const AO_RADIUS_CSS = 32;
/** The layer of what `drawUnseen` draws, which the lights are on as well. */
const UNSEEN_LAYER = 31;

export type AODepth = 'own-pass' | 'main-pass';

export interface SceneViewerOptions {
  /** The vertex attributes of the content's surface, which the looks are built for (`createLooks`). */
  surface: readonly SurfaceAttribute[];
  /** The ids of the looks the content can be drawn in; by default all that its surface allows. */
  looks?: readonly string[];
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
 * A three.js view of a surface on WebGL 2 (`SceneView`): the renderer, the looks, and the ambient-occlusion and bloom
 * passes. The content puts its meshes in `chunks`, where they take the look's material, and their inverted hulls in
 * `outlines`.
 */
export class SceneViewer extends SceneView {
  readonly looks: Look[];
  protected renderer: THREE.WebGLRenderer;
  protected chunks = new THREE.Group();
  protected outlines = new THREE.Group();
  /** The chunks and outlines, without the overlays: what ambient occlusion is computed from. A scene, for the pass. */
  protected surfaces = new THREE.Scene();
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
  private viewDir = new THREE.Vector3();

  constructor(
    container: HTMLElement,
    private options: SceneViewerOptions
  ) {
    // Transparent canvas over CSS backgrounds: gradients stay untouched by tone mapping and post-processing. Drawn
    // through the composer every frame, the canvas only takes the output pass's quad: no depth, nor antialiasing.
    const renderer = new THREE.WebGLRenderer({
      antialias: !options.composeAlways,
      depth: !options.composeAlways,
      alpha: true,
      powerPreference: options.powerPreference ?? 'default',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMappingExposure = 0.95;
    super(container, renderer.domElement);
    this.renderer = renderer;
    renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);

    // Light rigs ride on the camera so every look keeps its lighting while orbiting.
    this.looks = createLooks(renderer.getPixelRatio(), options.surface, options.looks);
    for (const l of this.looks) {
      if (!l.rig) continue;
      this.camera.add(l.rig);
      l.rig.traverse((o) => o.layers.enable(UNSEEN_LAYER));
    }
    this.outlines.name = 'outline';
    this.surfaces.add(this.chunks, this.outlines);
    this.scene.add(this.surfaces);
    this.look = this.looks.find((l) => l.id === DEFAULT_LOOK) ?? this.looks[0];
    // Nothing here calls a method a subclass overrides: its fields are only set once this returns.
    this.paintLook();
    this.applyBackground();
    this.fitCanvas();
    if (options.composeAlways) this.ensureComposer();
    this.invalidate();
  }

  protected override disposeStage(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    for (const l of this.looks) {
      disposeMaterial(l.material);
      if (l.outline) disposeMaterial(l.outline);
    }
    this.environment?.dispose();
    this.disposeComposer();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  // ---------------------------------------------------------------------------
  // Rendering

  protected override animate(loop: (() => void) | null): void {
    this.renderer.setAnimationLoop(loop);
  }

  /** The GPU took the context, and what was uploaded with it. */
  protected contextLost(): void {}

  /** After three rebuilt what it kept the sources of. */
  protected contextRestored(): void {}

  private composing(): boolean {
    return this.options.composeAlways === true || this.ao || this.look.bloom === true;
  }

  /** A frame, cut down as `motionFrame` says where the camera moves: how it was drawn, or null without the composer. */
  protected override draw(moving = false): MovingFrame | null {
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

  /** The fog ranges tied to the orbit distance, and the depths the depth-coded look's colours span. */
  protected override cameraTied(d: number, reach: number): void {
    const camera = this.camera;
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

  protected override sizeStage(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    for (const p of this.pipelines) this.fitPipeline(p);
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
  protected override projectionChanged(): void {
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
}
