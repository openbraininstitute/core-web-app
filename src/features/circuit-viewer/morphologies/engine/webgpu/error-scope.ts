/** What `make` makes on `device`, with `failed` told a moment later of an error of `filter` it caused. */
export function scoped<T>(
  device: GPUDevice,
  filter: GPUErrorFilter,
  make: () => T,
  failed: (error: GPUError) => void
): T {
  device.pushErrorScope(filter);
  try {
    return make();
  } finally {
    device.popErrorScope().then(
      (error) => {
        if (error) failed(error);
      },
      () => undefined
    );
  }
}
