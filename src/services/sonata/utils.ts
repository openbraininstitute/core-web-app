export function resolveError(ex: unknown) {
  if (ex instanceof Error) return ex.message;
  if (typeof ex === 'string') return ex;
  return JSON.stringify(ex, null, 2);
}

export function bubbleError(ex: unknown, message: string): never {
  throw new Error(`${resolveError(ex)}\nThis error occured ${message}`);
}
