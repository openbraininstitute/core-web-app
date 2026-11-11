/** `name` without what a file name cannot hold. */
export function fileName(name: string, fallback: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_').trim() || fallback;
}
