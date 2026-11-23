import { Extension } from '@tiptap/core';
import { Collaboration, isChangeOrigin } from '@tiptap/extension-collaboration';
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret';
import { UniqueID } from '@tiptap/extension-unique-id';
import { Markdown } from '@tiptap/markdown';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { isNil } from 'es-toolkit';

import { BLOCK_TYPES, contentExtensions } from '@/features/logbook/blocks/extensions';
import { CollaborationChanges } from '@/features/logbook/collaboration/changes';
import { FALLBACK_COLOUR, FRAGMENT } from '@/features/logbook/constants';
import { CalloutView } from '@/features/logbook/editor/blocks/callout-view';
import { EntityView } from '@/features/logbook/editor/blocks/entity-view';
import { FigureView } from '@/features/logbook/editor/blocks/figure-view';
import { FileView } from '@/features/logbook/editor/blocks/file-view';
import { tokenize } from '@/features/logbook/editor/highlight';
import { TokenKind } from '@/features/logbook/types';

import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { AnyExtension } from '@tiptap/core';
import type { Node as PmNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import type { ReactNodeViewProps } from '@tiptap/react';
import type { ComponentType } from 'react';
import type { ICaretUser, IEditorOptions } from '@/features/logbook/types';

const views: Readonly<Record<string, ComponentType<ReactNodeViewProps>>> = {
  entity: EntityView,
  file: FileView,
  figure: FigureView,
  callout: CalloutView,
};

/**
 * Cancels a drag that starts in a block card's own UI (selected text, an image): the browser
 * carried the card's rendered HTML, and a drop in the page inserted it as paragraphs. Moving the
 * card starts on the node's element, outside the wrapper, and text inside a callout is page text.
 */
export function stopInnerDrag(event: Event): void {
  const target = event.target;
  const from = target instanceof Element ? target : (target as Node | null)?.parentElement;
  if (isNil(from?.closest('[data-node-view-wrapper]'))) return;
  if (isNil(from?.closest('[data-node-view-content]'))) event.preventDefault();
}

const InnerDragGuard = Extension.create({
  name: 'innerDragGuard',
  addProseMirrorPlugins: () => [
    new Plugin({
      // Capture phase: the node view's stopEvent keeps this event from ProseMirror's handlers.
      view: (view) => {
        view.dom.addEventListener('dragstart', stopInnerDrag, true);
        return { destroy: () => view.dom.removeEventListener('dragstart', stopInnerDrag, true) };
      },
    }),
  ],
});

export const withViews = (): AnyExtension[] => [
  ...contentExtensions.map((extension) => {
    const view = views[extension.name];
    return isNil(view)
      ? extension
      : extension.extend({ addNodeView: () => ReactNodeViewRenderer(view) });
  }),
  InnerDragGuard,
];

const CODE_BLOCK = 'codeBlock';

export function codeDecorations(doc: PmNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== CODE_BLOCK) return !node.isTextblock;
    let offset = pos + 1;
    for (const line of node.textContent.split('\n')) {
      for (const token of tokenize(line))
        if (token.kind !== TokenKind.Text)
          decorations.push(
            Decoration.inline(offset + token.from, offset + token.from + token.text.length, {
              'data-tok': token.kind,
            })
          );
      offset += line.length + 1;
    }
    return false;
  });
  return DecorationSet.create(doc, decorations);
}

function touchesCode(tr: Transaction): boolean {
  let hit = false;
  const visit = (node: PmNode): boolean => {
    if (node.type.name === CODE_BLOCK) hit = true;
    return !hit && !node.isTextblock;
  };
  tr.steps.forEach((step, index) => {
    const after = tr.mapping.slice(index + 1);
    step.getMap().forEach((oldStart, oldEnd, newStart, newEnd) => {
      tr.docs[index]?.nodesBetween(oldStart, oldEnd, visit);
      tr.doc.nodesBetween(after.map(newStart, -1), after.map(newEnd, 1), visit);
    });
  });
  return hit;
}

export const codeHighlightKey = new PluginKey<DecorationSet>('codeHighlight');
export const CodeHighlight = Extension.create({
  name: 'codeHighlight',
  addProseMirrorPlugins: () => [
    new Plugin<DecorationSet>({
      key: codeHighlightKey,
      state: {
        init: (_config, state) => codeDecorations(state.doc),
        apply: (tr, old) => {
          if (!tr.docChanged) return old;
          return touchesCode(tr) ? codeDecorations(tr.doc) : old.map(tr.mapping, tr.doc);
        },
      },
      props: { decorations: (state) => codeHighlightKey.getState(state) },
    }),
  ],
});

export const caretColourOf = (user: Record<string, unknown>): string => {
  const colour = user['color'];
  return typeof colour === 'string' && /^#[0-9a-f]{6}$/i.test(colour) ? colour : FALLBACK_COLOUR;
};

function caretOf(name: string, colour: string): HTMLElement {
  const caret = document.createElement('span');
  caret.className = 'rl-caret';
  caret.style.borderColor = colour;
  const flag = document.createElement('span');
  flag.className = 'rl-flag';
  flag.style.background = colour;
  flag.textContent = name.split(/\s+/)[0] ?? name;
  caret.append(flag);
  return caret;
}

export function editorExtensions(options: IEditorOptions): AnyExtension[] {
  const { provider, me } = options;
  return [
    ...withViews(),
    UniqueID.configure({
      types: [...BLOCK_TYPES],
      filterTransaction: (transaction) => !isChangeOrigin(transaction),
    }),
    Collaboration.configure({ document: provider.document, field: FRAGMENT }),
    CollaborationCaret.configure({
      provider,
      user: { userId: me.key, name: me.name, color: me.colour } satisfies ICaretUser,
      render: (user) => caretOf(options.caretName(user), caretColourOf(user)),
      selectionRender: (user) => ({
        style: `background-color: color-mix(in srgb, ${caretColourOf(user)} 22%, transparent)`,
      }),
    }),
    Markdown,
    CodeHighlight,
    CollaborationChanges.configure({
      doc: provider.document,
      feed: options.feed,
      me,
      resolve: options.resolve,
      highlights: options.highlights,
      ready: options.ready,
    }),
  ];
}

export const previewExtensions = (document: HocuspocusProvider['document']): AnyExtension[] => [
  ...withViews(),
  Collaboration.configure({ document, field: FRAGMENT }),
  CodeHighlight,
];
