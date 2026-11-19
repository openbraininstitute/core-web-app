// Where an uploaded file is saved in a log's files folder: one rule for the web app, which shows the
// file's block before the upload ends, and the logbook server, which decides the name.

import { isNil } from 'es-toolkit';

export const IMAGE = /\.(png|jpe?g|gif|svg|webp)$/i;

// `[<folder>/]<stem>.<first 12 hex of the SHA-256>.<extension>`: the hash goes before the extension
// (the last dot, unless it is the first character). The name carries the content, so the same name
// always holds the same bytes: a page that points at it always shows the same file.
// The folder is the agent's own layout (its topic folder: `plots`, `results/control`, …); a web
// upload has none and is saved at the top of the files folder.
export function savedNameOf(fileName: string, hash: string, folder?: string): string {
  const dot = fileName.lastIndexOf('.');
  const short = hash.slice(0, 12);
  const name =
    dot > 0 ? `${fileName.slice(0, dot)}.${short}${fileName.slice(dot)}` : `${fileName}.${short}`;
  return isNil(folder) ? name : `${folder}/${name}`;
}
