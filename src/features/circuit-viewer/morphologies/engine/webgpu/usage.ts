// The bits of GPUBufferUsage, GPUTextureUsage and GPUMapMode: TypeScript's DOM library types WebGPU but leaves those
// objects out.
export const MAP_READ = 0x0001;
export const COPY_SRC = 0x0004;
export const COPY_DST = 0x0008;
export const UNIFORM = 0x0040;
export const STORAGE = 0x0080;
export const INDIRECT = 0x0100;

export const TEXTURE_BINDING = 0x04;
export const STORAGE_BINDING = 0x08;

export const READ = 0x0001;
