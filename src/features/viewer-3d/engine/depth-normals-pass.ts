import * as THREE from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';

/**
 * The view-space normals rebuilt from the scene's depth, once per pixel of the occlusion, for GTAO to read
 * (`GTAOPass.setGBuffer(depth, normals)`). Given the depth alone, GTAO rebuilds a normal from nine depth reads for each
 * of its pixels, and its denoise again for each of its 16 samples: three quarters of the occlusion's reads. The
 * normals are rebuilt as three's GTAO shader does it, and packed into 8 bits a component.
 */
export class DepthNormalsPass extends Pass {
  readonly target = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
  });
  private material: THREE.ShaderMaterial;
  private quad: FullScreenQuad;

  constructor(
    depth: THREE.DepthTexture,
    public camera: THREE.Camera
  ) {
    super();
    this.needsSwap = false;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDepth: { value: depth },
        cameraProjectionMatrixInverse: { value: new THREE.Matrix4() },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform highp sampler2D tDepth;
        uniform mat4 cameraProjectionMatrixInverse;
        #include <packing>

        vec3 getViewPosition(const in vec2 screenPosition, const in float depth) {
          vec4 clipSpacePosition = vec4(vec3(screenPosition, depth) * 2.0 - 1.0, 1.0);
          vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
          return viewSpacePosition.xyz / viewSpacePosition.w;
        }

        float fetchDepth(const ivec2 uv) {
          return texelFetch(tDepth, uv.xy, 0).x;
        }

        void main() {
          vec2 size = vec2(textureSize(tDepth, 0));
          ivec2 p = ivec2(vUv * size);
          float c0 = fetchDepth(p);
          float l2 = fetchDepth(p - ivec2(2, 0));
          float l1 = fetchDepth(p - ivec2(1, 0));
          float r1 = fetchDepth(p + ivec2(1, 0));
          float r2 = fetchDepth(p + ivec2(2, 0));
          float b2 = fetchDepth(p - ivec2(0, 2));
          float b1 = fetchDepth(p - ivec2(0, 1));
          float t1 = fetchDepth(p + ivec2(0, 1));
          float t2 = fetchDepth(p + ivec2(0, 2));
          float dl = abs((2.0 * l1 - l2) - c0);
          float dr = abs((2.0 * r1 - r2) - c0);
          float db = abs((2.0 * b1 - b2) - c0);
          float dt = abs((2.0 * t1 - t2) - c0);
          vec3 ce = getViewPosition(vUv, c0).xyz;
          vec3 dpdx = (dl < dr)
            ? ce - getViewPosition(vUv - vec2(1.0 / size.x, 0.0), l1).xyz
            : -ce + getViewPosition(vUv + vec2(1.0 / size.x, 0.0), r1).xyz;
          vec3 dpdy = (db < dt)
            ? ce - getViewPosition(vUv - vec2(0.0, 1.0 / size.y), b1).xyz
            : -ce + getViewPosition(vUv + vec2(0.0, 1.0 / size.y), t1).xyz;
          gl_FragColor = vec4(packNormalToRGB(normalize(cross(dpdx, dpdy))), 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  get texture(): THREE.Texture {
    return this.target.texture;
  }

  /** At the occlusion's own size, which the composer's `setSize` doesn't know: hence not that. */
  resize(width: number, height: number): void {
    this.target.setSize(width, height);
  }

  override render(renderer: THREE.WebGLRenderer): void {
    this.material.uniforms.cameraProjectionMatrixInverse.value.copy(
      this.camera.projectionMatrixInverse
    );
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(this.target);
    this.quad.render(renderer);
    renderer.setRenderTarget(previous);
  }

  override dispose(): void {
    this.target.dispose();
    this.material.dispose();
    this.quad.dispose();
  }
}
