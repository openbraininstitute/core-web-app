'use client';

import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  drawSelection,
  EditorView,
  keymap,
  placeholder,
} from '@codemirror/view';
import { useEffect, useRef } from 'react';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';
import * as Y from 'yjs';

import { cn } from '@/utils/css-class';

import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { TextRange } from './use-agent-activity';

/** Puts the tint on an agent's new text; the marks then move with the edits around them. */
const setAgentMarks = StateEffect.define<TextRange[]>();
const agentMark = Decoration.mark({ class: 'rl-agent-new' });
const agentMarks = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(marks, tr) {
    let next = marks.map(tr.changes);
    for (const effect of tr.effects) {
      if (!effect.is(setAgentMarks)) continue;
      const length = tr.state.doc.length;
      next = Decoration.set(
        effect.value
          .filter((r) => r.from < r.to && r.to <= length)
          .map((r) => agentMark.range(r.from, r.to)),
        true
      );
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const theme = EditorView.theme({
  '&': { fontSize: '15px', color: 'var(--color-primary-9, #002766)', height: '100%' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.7' },
  '.cm-content': { padding: '0 0 4rem', caretColor: 'currentColor' },
  '.cm-line': { padding: '0' },
  '.cm-placeholder': { color: '#a3a3a3' },
  // other people's names over their cursors, always shown rather than on hover only
  '.cm-ySelectionInfo': {
    opacity: '1',
    fontFamily: 'inherit',
    fontSize: '11px',
    padding: '1px 4px',
  },
});

/**
 * The log's markdown as one shared text: every keystroke goes to everyone with it open, and their
 * cursors and selections show in their colours.
 */
export function LiveEditor({
  text,
  awareness,
  readOnly,
  onView,
  agentChanges,
  className,
}: {
  text: Y.Text;
  awareness: HocuspocusProvider['awareness'];
  readOnly: boolean;
  onView?: (view: EditorView | null) => void;
  /** The agent's recent text: `key` changes when there is a new edit, `ranges` say where it is. */
  agentChanges?: { key: string; ranges: TextRange[] };
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onViewRef = useRef(onView);
  onViewRef.current = onView;

  useEffect(() => {
    if (!host.current) return;
    const undoManager = new Y.UndoManager(text);
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: text.toString(),
        extensions: [
          keymap.of([...yUndoManagerKeymap, ...defaultKeymap, indentWithTab]),
          drawSelection(),
          markdown(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          EditorView.lineWrapping,
          placeholder('Write in markdown. A line holding only an entity link becomes a card.'),
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          yCollab(text, awareness, { undoManager }),
          agentMarks,
          theme,
        ],
      }),
    });
    viewRef.current = view;
    onViewRef.current?.(view);
    view.focus();
    return () => {
      viewRef.current = null;
      onViewRef.current?.(null);
      view.destroy();
      undoManager.destroy();
    };
  }, [text, awareness, readOnly]);

  // marked once per new edit: after that the marks follow the text by themselves
  const latestChanges = useRef(agentChanges);
  latestChanges.current = agentChanges;
  const changesKey = agentChanges?.key ?? '';
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new edit is the trigger
  useEffect(() => {
    viewRef.current?.dispatch({ effects: setAgentMarks.of(latestChanges.current?.ranges ?? []) });
  }, [changesKey]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the editor inside is the keyboard path
    <div
      ref={host}
      // a click in the room under the text puts the caret at its end
      onMouseDown={(e) => {
        const view = viewRef.current;
        if (e.target !== e.currentTarget || !view) return;
        e.preventDefault();
        view.focus();
        view.dispatch({ selection: { anchor: view.state.doc.length } });
      }}
      className={cn('min-h-full cursor-text', className)}
    />
  );
}

/** Puts each line in as a paragraph of its own after the line the cursor is on. */
export function insertParagraphs(view: EditorView, lines: string[]) {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.head);
  const before = line.text.trim() === '' ? '\n' : '\n\n';
  const after = line.number === state.doc.lines ? '\n' : '\n\n';
  const insert = `${before}${lines.join('\n\n')}${after}`;
  view.dispatch({
    changes: { from: line.to, insert },
    selection: { anchor: line.to + insert.length - after.length },
    scrollIntoView: true,
  });
  view.focus();
}
