/** Draco's Emscripten builds for glTF. The modules are opaque here: they are handed to glTF-Transform. */
interface DracoModuleOptions {
  /** The WASM bytes, where the glue cannot read them from disk itself. */
  wasmBinary?: ArrayBuffer;
}

declare module 'draco3dgltf' {
  const draco3d: {
    createEncoderModule(options?: DracoModuleOptions): Promise<unknown>;
    createDecoderModule(options?: DracoModuleOptions): Promise<unknown>;
  };
  export default draco3d;
}

declare module 'draco3dgltf/draco_encoder_gltf_nodejs.js' {
  const createEncoderModule: (options?: DracoModuleOptions) => Promise<unknown>;
  export default createEncoderModule;
}
