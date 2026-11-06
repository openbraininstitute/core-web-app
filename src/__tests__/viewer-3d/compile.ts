import * as THREE from 'three';

/** The shader lib entry three compiles a built-in material from (WebGLPrograms' `shaderIDs`). */
const SHADER_IDS: Record<string, string> = {
  MeshBasicMaterial: 'basic',
  MeshToonMaterial: 'toon',
  MeshStandardMaterial: 'physical',
  MeshPhysicalMaterial: 'physical',
  MeshMatcapMaterial: 'matcap',
  MeshNormalMaterial: 'normal',
};

/** What three hands a material's `onBeforeCompile`: the shader sources, includes not yet resolved. */
export function compile(m: THREE.Material): {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, THREE.IUniform>;
} {
  const sm = m as THREE.ShaderMaterial;
  const src = sm.isShaderMaterial ? sm : THREE.ShaderLib[SHADER_IDS[m.type]];
  const shader = {
    vertexShader: src.vertexShader,
    fragmentShader: src.fragmentShader,
    uniforms: THREE.UniformsUtils.clone(src.uniforms),
  };
  m.onBeforeCompile(
    shader as unknown as THREE.WebGLProgramParametersWithUniforms,
    null as unknown as THREE.WebGLRenderer
  );
  return shader;
}

/**
 * The functions and globals declared more than once in a shader, which GLSL refuses: two hooks bringing the same code.
 * A global is a uniform, or what goes in or out of the stage, with or without `flat` and a precision.
 */
export function redeclared(source: string): string[] {
  const names = [
    ...source.matchAll(
      /^\s*(?:(?:flat\s+)?(?:uniform|varying|attribute|in|out)\s+(?:(?:high|medium|low)p\s+)?\w+\s+(\w+);|\w+\s+(\w+)\(.*\)\s*\{)\s*$/gm
    ),
  ].map((m) => m[1] ?? m[2]);
  return names.filter((n, i) => names.indexOf(n) !== i);
}
