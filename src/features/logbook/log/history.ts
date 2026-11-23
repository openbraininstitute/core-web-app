import { Node as PmNode } from '@tiptap/pm/model';
import { ySyncPluginKey } from '@tiptap/y-tiptap';
import { isNil, isNotNil } from 'es-toolkit';
import * as Y from 'yjs';

import { HISTORY_MAX_PIECES } from '@/features/logbook/constants';
import { clip } from '@/features/logbook/helpers';

import type { EditorState } from '@tiptap/pm/state';
import type { IActor, IPiece, IRun } from '@/features/logbook/types';

export const cardLabelOf = (node: PmNode): string => {
  const label: unknown = node.attrs['name'] ?? node.attrs['alt'] ?? node.attrs['src'];
  return typeof label === 'string' && label.length > 0 ? label : node.type.name;
};

function runsOfBlock(element: Y.XmlElement, from: number, to: number): IRun[] {
  const runs: IRun[] = [];
  let offset = 0;
  for (const child of element.toArray()) {
    if (!(child instanceof Y.XmlText)) {
      offset += 1;
      continue;
    }
    // Yjs has no public item walk; _start is its documented head.
    // oxlint-disable-next-line eslint/no-underscore-dangle
    let item = child._start;
    while (isNotNil(item)) {
      if (!item.deleted && item.countable) {
        const start = Math.max(from, offset);
        const end = Math.min(to, offset + item.length);
        if (end > start && item.content instanceof Y.ContentString)
          runs.push({
            client: item.id.client,
            text: item.content.str.slice(start - offset, end - offset),
          });
        offset += item.length;
      }
      item = item.right instanceof Y.Item ? item.right : null;
    }
  }
  return runs;
}

export function piecesOf(
  state: EditorState,
  from: number,
  to: number,
  resolve: (clientId: number) => IActor
): IPiece[] {
  const binding: unknown = ySyncPluginKey.getState(state)?.binding;
  const mapping: unknown = isNil(binding) ? null : Reflect.get(Object(binding), 'mapping');
  if (!(mapping instanceof Map)) return [];
  const elements = new Map<PmNode, Y.XmlElement>();
  mapping.forEach((node: unknown, type: unknown) => {
    if (type instanceof Y.XmlElement && node instanceof PmNode) elements.set(node, type);
  });
  const runs: IRun[] = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.isBlock && node.isAtom) {
      // oxlint-disable-next-line eslint/no-underscore-dangle
      const client = elements.get(node)?._item?.id.client;
      if (isNotNil(client)) runs.push({ client, text: cardLabelOf(node) });
      return false;
    }
    if (!node.isTextblock) return true;
    const element = elements.get(node);
    if (isNotNil(element)) {
      const start = pos + 1;
      runs.push(
        ...runsOfBlock(
          element,
          Math.max(from, start) - start,
          Math.min(to, start + node.content.size) - start
        )
      );
    }
    return false;
  });
  const pieces: { actor: IActor; text: string }[] = [];
  for (const run of runs) {
    const actor = resolve(run.client);
    const last = pieces.at(-1);
    if (isNotNil(last) && last.actor.key === actor.key) last.text += run.text;
    else pieces.push({ actor, text: run.text });
  }
  return pieces
    .filter((piece) => piece.text.trim().length > 0)
    .slice(0, HISTORY_MAX_PIECES)
    .map((piece) => ({ actor: piece.actor, text: clip(piece.text, 70) }));
}
