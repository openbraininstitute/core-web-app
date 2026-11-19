// A file from this computer into the open page (Insert, "From your computer"). The saved name is
// known before the upload (it carries the content hash), so the figure or file card goes into the
// page at once (this tab shows "Uploading…", other screens the placeholder) and fills in when the
// file is listed. A failed upload takes its own block out again and says why: no block it made
// points at a file that never arrived.
import { isNil, isNotNil } from 'es-toolkit';
import { useSyncExternalStore } from 'react';

import {
  isTooLarge,
  logFilesQuery,
  planFile,
  uploadLogFile,
} from '@/features/logbook/api/log-files';
import { insertAfterBlock } from '@/features/logbook/editor/insert';
import { settings } from '@/features/logbook/settings';
import { IMAGE } from '@/features/logbook/shared/files';

import type { QueryClient } from '@tanstack/react-query';
import type { Node as PmNode } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/react';
import type { IProject } from '@/features/logbook/auth/session';

// The saved names uploading from this tab (observer pattern: blocks subscribe to one name).
const uploading = new Set<string>();
const listeners = new Set<() => void>();
const changed = (): void => {
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useUploading = (path: string): boolean =>
  useSyncExternalStore(subscribe, () => uploading.has(path));

const pointsAt = (node: PmNode, path: string): boolean =>
  node.attrs['src'] === path || node.attrs['path'] === path;

// The id of the block an upload just put at `pos`, as UniqueID stamped it in the same dispatch
// (it may move a given id to a neighbour, so the id is read back, never chosen). Null when the
// block there is not the upload's: nothing is ever removed then.
export function insertedBlockId(doc: PmNode, pos: number, path: string): string | null {
  const node = doc.nodeAt(pos);
  const id: unknown = node?.attrs['id'];
  return isNotNil(node) && pointsAt(node, path) && typeof id === 'string' ? id : null;
}

// Where the top-level block with this id is now; null when it is gone (removed or never there).
export function blockRange(doc: PmNode, id: string): { from: number; to: number } | null {
  let found: { from: number; to: number } | null = null;
  doc.forEach((node, offset) => {
    if (isNil(found) && node.attrs['id'] === id)
      found = { from: offset, to: offset + node.nodeSize };
  });
  return found;
}

// The block this upload inserted, and only it: the same file elsewhere in the page (same bytes,
// same saved name) stays.
function removeBlock(editor: Editor, id: string): void {
  if (editor.isDestroyed) return;
  const range = blockRange(editor.state.doc, id);
  if (isNil(range)) return;
  editor.view.dispatch(editor.state.tr.delete(range.from, range.to));
}

export interface IUploadTarget {
  readonly editor: Editor;
  readonly logId: string;
  readonly project: IProject;
  readonly client: QueryClient;
  readonly notify: (text: string) => void;
}

export async function uploadIntoPage(target: IUploadTarget, file: File): Promise<void> {
  const { editor, logId, project, client, notify } = target;
  // Checked on file.size, before the file is read: a refused file never goes into memory.
  if (isTooLarge(file.size)) {
    notify(`${file.name} was not uploaded: it is larger than ${settings.upload.maxMb} MB`);
    return;
  }
  let planned;
  try {
    planned = await planFile(file);
  } catch (error) {
    // Unreadable file (moved, no permission) or out of memory: nothing was inserted yet.
    notify(`${file.name} was not uploaded: ${error instanceof Error ? error.message : 'error'}`);
    return;
  }
  const { path } = planned;
  const stem = file.name.replace(/\.[^.]+$/, '');
  uploading.add(path);
  changed();
  const at = insertAfterBlock(
    editor,
    IMAGE.test(file.name)
      ? { type: 'figure', attrs: { src: path, alt: stem } }
      : { type: 'file', attrs: { name: file.name, path } }
  );
  const inserted = insertedBlockId(editor.state.doc, at, path);
  try {
    await uploadLogFile(logId, project, file, planned);
    await client.invalidateQueries({ queryKey: logFilesQuery(logId, project).queryKey });
    notify(`${file.name} uploaded`);
  } catch (error) {
    if (isNotNil(inserted)) removeBlock(editor, inserted);
    notify(`${file.name} was not uploaded: ${error instanceof Error ? error.message : 'error'}`);
  } finally {
    uploading.delete(path);
    changed();
  }
}

// Limit: one file at a time, in order. Upgrade: parallel uploads, if people drop many at once.
export async function uploadFiles(target: IUploadTarget, files: FileList | null): Promise<void> {
  if (isNil(files)) return;
  for (const file of files) await uploadIntoPage(target, file);
}
