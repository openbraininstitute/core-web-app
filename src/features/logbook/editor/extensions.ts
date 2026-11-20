import { Extension } from '@tiptap/core';
import { Collaboration, isChangeOrigin } from '@tiptap/extension-collaboration';
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret';
import { UniqueID } from '@tiptap/extension-unique-id';
import { Markdown } from '@tiptap/markdown';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { isNil } from 'es-toolkit';

import { BLOCK_TYPES, contentExtensions, FRAGMENT } from '@/features/logbook/blocks/extensions';
import { CollaborationChanges } from '@/features/logbook/collaboration/changes';
import { CalloutView } from '@/features/logbook/editor/blocks/callout-view';
import { EntityView } from '@/features/logbook/editor/blocks/entity-view';
import { FigureView } from '@/features/logbook/editor/blocks/figure-view';
import { FileView } from '@/features/logbook/editor/blocks/file-view';
import { TokenKind, tokenize } from '@/features/logbook/editor/highlight';

import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { AnyExtension } from '@tiptap/core';
import type { Node as PmNode } from '@tiptap/pm/model';
import type { ReactNodeViewProps } from '@tiptap/react';
import type { ComponentType } from 'react';
import type { ChangeFeed } from '@/features/logbook/collaboration/changes';
import type { IActor } from '@/features/logbook/ui/avatar';

const views: Readonly<Record<string, ComponentType<ReactNodeViewProps>>> = {
  entity: EntityView,
  file: FileView,
  figure: FigureView,
  callout: CalloutView,
};

export const withViews = (): AnyExtension[] =>
  contentExtensions.map((extension) => {
    const view = views[extension.name];
    return isNil(view)
      ? extension
      : extension.extend({ addNodeView: () => ReactNodeViewRenderer(view) });
  });

// Code block colours; recomputed only when the text changes.
function codeDecorations(doc: PmNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== 'codeBlock') return true;
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

const codeKey = new PluginKey<DecorationSet>('codeHighlight');
export const CodeHighlight = Extension.create({
  name: 'codeHighlight',
  addProseMirrorPlugins: () => [
    new Plugin<DecorationSet>({
      key: codeKey,
      state: {
        init: (_config, state) => codeDecorations(state.doc),
        apply: (tr, old) => (tr.docChanged ? codeDecorations(tr.doc) : old),
      },
      props: { decorations: (state) => codeKey.getState(state) },
    }),
  ],
});

export interface ICaretUser {
  readonly userId: string;
  readonly name: string;
  readonly color: string;
}

export interface IEditorOptions {
  readonly provider: HocuspocusProvider;
  readonly me: IActor;
  readonly feed: ChangeFeed;
  readonly resolve: (clientId: number) => IActor;
  // The server's label for the user id, never the awareness text.
  readonly caretName: (user: Record<string, unknown>) => string;
  readonly highlights: () => boolean;
  readonly ready: () => boolean;
}

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
    // Remote changes keep their ids; only our own edits stamp new ones.
    UniqueID.configure({
      types: [...BLOCK_TYPES],
      filterTransaction: (transaction) => !isChangeOrigin(transaction),
    }),
    Collaboration.configure({ document: provider.document, field: FRAGMENT }),
    CollaborationCaret.configure({
      provider,
      user: { userId: me.key, name: me.name, color: me.colour } satisfies ICaretUser,
      render: (user) => {
        const colour = typeof user['color'] === 'string' ? user['color'] : '#595959';
        return caretOf(options.caretName(user), colour);
      },
      selectionRender: (user) => ({
        style: `background-color: color-mix(in srgb, ${String(user['color'] ?? '#40a9ff')} 22%, transparent)`,
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

// Read-only on the same Yjs doc: follows changes, no carets, tints or block ids.
export const previewExtensions = (document: HocuspocusProvider['document']): AnyExtension[] => [
  ...withViews(),
  Collaboration.configure({ document, field: FRAGMENT }),
  CodeHighlight,
];
