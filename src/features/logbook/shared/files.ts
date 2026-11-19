import { isNil } from 'es-toolkit';

export const IMAGE = /\.(png|jpe?g|gif|svg|webp)$/i;

// `[<folder>/]<stem>.<first 12 hex of SHA-256>.<ext>`: the same name always holds the same bytes.
// Web uploads have no folder and land at the top.
export function savedNameOf(fileName: string, hash: string, folder?: string): string {
  const dot = fileName.lastIndexOf('.');
  const short = hash.slice(0, 12);
  const name =
    dot > 0 ? `${fileName.slice(0, dot)}.${short}${fileName.slice(dot)}` : `${fileName}.${short}`;
  return isNil(folder) ? name : `${folder}/${name}`;
}
