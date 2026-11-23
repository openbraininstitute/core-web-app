import { isNil, isNotNil } from 'es-toolkit';
import { useSyncExternalStore } from 'react';

import {
  isTooLarge,
  logFilesQuery,
  planFile,
  uploadLogFile,
} from '@/features/logbook/api/log-files';
import { insertAfterBlock } from '@/features/logbook/editor/insert';
import { reasonOf } from '@/features/logbook/log/notice';
import { settings } from '@/features/logbook/settings';
import { IMAGE } from '@/features/logbook/shared/files';
import { NoticeKind } from '@/features/logbook/types';

import type { Node as PmNode } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/react';
import type { IUploadTarget } from '@/features/logbook/types';

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

export function insertedBlockId(doc: PmNode, pos: number, path: string): string | null {
  const node = doc.nodeAt(pos);
  const id: unknown = node?.attrs['id'];
  return isNotNil(node) && pointsAt(node, path) && typeof id === 'string' ? id : null;
}

export function blockRange(doc: PmNode, id: string): { from: number; to: number } | null {
  let found: { from: number; to: number } | null = null;
  doc.forEach((node, offset) => {
    if (isNil(found) && node.attrs['id'] === id)
      found = { from: offset, to: offset + node.nodeSize };
  });
  return found;
}

function removeBlock(editor: Editor, id: string): void {
  if (editor.isDestroyed) return;
  const range = blockRange(editor.state.doc, id);
  if (isNil(range)) return;
  editor.view.dispatch(editor.state.tr.delete(range.from, range.to));
}

export async function uploadIntoPage(target: IUploadTarget, file: File): Promise<void> {
  const { editor, logId, project, client, notify } = target;
  if (isTooLarge(file.size)) {
    notify({
      kind: NoticeKind.Warning,
      title: `${file.name} is too large`,
      description: `Files can be up to ${settings.upload.maxMb} MB.`,
    });
    return;
  }
  let planned;
  try {
    planned = await planFile(file);
  } catch (error) {
    notify({
      kind: NoticeKind.Error,
      title: `${file.name} can't be read`,
      description: reasonOf(error),
    });
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
    notify({ kind: NoticeKind.Success, title: 'File uploaded', description: file.name });
  } catch (error) {
    if (isNotNil(inserted)) removeBlock(editor, inserted);
    notify({
      kind: NoticeKind.Error,
      title: `${file.name} was not uploaded`,
      description: reasonOf(error),
    });
  } finally {
    uploading.delete(path);
    changed();
  }
}

export async function uploadFiles(target: IUploadTarget, files: FileList | null): Promise<void> {
  if (isNil(files)) return;
  for (const file of files) await uploadIntoPage(target, file);
}
