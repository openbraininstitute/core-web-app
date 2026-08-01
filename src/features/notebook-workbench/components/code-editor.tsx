'use client';

import {
  acceptCompletion,
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { Compartment, EditorState, Prec } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { useEffect, useRef } from 'react';

import type { Kernel } from '@jupyterlab/services';

/** Syntax colours derived from the OBI palette rather than a stock theme. */
const obiHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.moduleKeyword, t.controlKeyword], color: '#0050b3', fontWeight: '600' },
  { tag: [t.operatorKeyword, t.modifier], color: '#0050b3' },
  { tag: [t.string, t.special(t.string), t.regexp], color: '#389e0d' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#8c8c8c', fontStyle: 'italic' },
  { tag: [t.number, t.bool, t.null, t.atom], color: '#cb5c00' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#096dd9' },
  { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: '#002766' },
  {
    tag: [t.className, t.definition(t.className), t.typeName],
    color: '#003a8c',
    fontWeight: '600',
  },
  { tag: [t.propertyName, t.attributeName], color: '#003a8c' },
  { tag: [t.variableName], color: '#141414' },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: '#595959' },
  { tag: [t.self, t.standard(t.variableName)], color: '#0050b3', fontStyle: 'italic' },
  { tag: [t.heading], color: '#002766', fontWeight: '700' },
  { tag: [t.link, t.url], color: '#096dd9', textDecoration: 'underline' },
  { tag: [t.emphasis], fontStyle: 'italic' },
  { tag: [t.strong], fontWeight: '700' },
  { tag: [t.invalid], color: '#ff4d4f' },
]);

export interface EditorActions {
  onChange: (value: string) => void;
  onRun?: () => void;
  onRunSelect?: () => void;
  onRunInsert?: () => void;
  onEscape?: () => void;
  onArrowOut?: (direction: -1 | 1) => void;
  onSave?: () => void;
  onSplit?: (offset: number) => void;
  onMergeBack?: () => void;
}

interface CodeEditorProps extends EditorActions {
  value: string;
  language: 'python' | 'markdown' | 'json' | 'text';
  readOnly?: boolean;
  showLineNumbers?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  /** Used to source completions from the live kernel. */
  kernel?: Kernel.IKernelConnection | null;
  fillHeight?: boolean;
}

function languageExtension(language: CodeEditorProps['language']) {
  switch (language) {
    case 'python':
      return python();
    case 'markdown':
      return markdown();
    case 'json':
      return json();
    default:
      return [];
  }
}

export function CodeEditor({
  value,
  language,
  readOnly = false,
  showLineNumbers = false,
  autoFocus = false,
  kernel,
  fillHeight = false,
  ...actions
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const kernelRef = useRef(kernel);
  kernelRef.current = kernel;
  const languageCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());

  // Runs once: rebuilding the view on prop changes would destroy cursor and undo
  // history. Language and readOnly are swapped through compartments below, and
  // callbacks are read through actionsRef so they never go stale.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-once editor construction
  useEffect(() => {
    if (!host.current) return;

    const cellKeymap = Prec.highest(
      keymap.of([
        {
          key: 'Shift-Enter',
          run: () => {
            actionsRef.current.onRun?.();
            return true;
          },
        },
        {
          key: 'Mod-Enter',
          run: () => {
            actionsRef.current.onRunSelect?.();
            return true;
          },
        },
        {
          key: 'Alt-Enter',
          run: () => {
            actionsRef.current.onRunInsert?.();
            return true;
          },
        },
        {
          key: 'Mod-s',
          run: () => {
            actionsRef.current.onSave?.();
            return true;
          },
        },
        {
          key: 'Mod-Shift--',
          run: (v) => {
            actionsRef.current.onSplit?.(v.state.selection.main.head);
            return true;
          },
        },
        {
          key: 'Escape',
          run: () => {
            actionsRef.current.onEscape?.();
            return true;
          },
        },
        { key: 'Tab', run: acceptCompletion },
        {
          key: 'Backspace',
          run: (v) => {
            const { state } = v;
            if (state.doc.length === 0 && actionsRef.current.onMergeBack) {
              actionsRef.current.onMergeBack();
              return true;
            }
            return false;
          },
        },
        {
          key: 'ArrowUp',
          run: (v) => {
            const head = v.state.selection.main.head;
            if (v.state.selection.main.empty && v.state.doc.lineAt(head).number === 1) {
              actionsRef.current.onArrowOut?.(-1);
              return true;
            }
            return false;
          },
        },
        {
          key: 'ArrowDown',
          run: (v) => {
            const head = v.state.selection.main.head;
            const lastLine = v.state.doc.lines;
            if (v.state.selection.main.empty && v.state.doc.lineAt(head).number === lastLine) {
              actionsRef.current.onArrowOut?.(1);
              return true;
            }
            return false;
          },
        },
      ])
    );

    const completionSource = async (context: any) => {
      const activeKernel = kernelRef.current;
      if (!activeKernel) return null;
      const word = context.matchBefore(/[\w.]+/);
      if (!word && !context.explicit) return null;

      try {
        const reply = await activeKernel.requestComplete({
          code: context.state.doc.toString(),
          cursor_pos: context.pos,
        });
        const content = reply.content as any;
        if (content.status !== 'ok' || !content.matches?.length) return null;

        const types: Record<string, string> | undefined =
          content.metadata?._jupyter_types_experimental?.reduce?.(
            (acc: Record<string, string>, item: any) => {
              if (item?.text) acc[item.text] = item.type;
              return acc;
            },
            {}
          );

        return {
          from: content.cursor_start,
          to: content.cursor_end,
          options: content.matches.map((label: string) => ({
            label,
            type: normaliseType(types?.[label]),
          })),
          validFor: /^[\w.]*$/,
        };
      } catch {
        return null;
      }
    };

    const state = EditorState.create({
      doc: value,
      extensions: [
        cellKeymap,
        keymap.of([
          ...closeBracketsKeymap,
          ...completionKeymap,
          ...historyKeymap,
          ...defaultKeymap,
          indentWithTab,
        ]),
        history(),
        drawSelection(),
        rectangularSelection(),
        highlightSpecialChars(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        highlightActiveLine(),
        autocompletion({ override: [completionSource], activateOnTyping: true, icons: false }),
        syntaxHighlighting(obiHighlight),
        EditorView.lineWrapping,
        languageCompartment.current.of(languageExtension(language)),
        readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly)),
        showLineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : [],
        fillHeight
          ? EditorView.theme({ '&': { height: '100%' }, '.cm-scroller': { overflow: 'auto' } })
          : [],
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            actionsRef.current.onChange(update.state.doc.toString());
          }
        }),
      ],
    });

    const instance = new EditorView({ state, parent: host.current });
    view.current = instance;
    if (autoFocus) {
      instance.focus();
      instance.dispatch({ selection: { anchor: instance.state.doc.length } });
    }

    return () => {
      instance.destroy();
      view.current = null;
    };
  }, []);

  // Push external edits (undo of a delete, reload from disk) into the view.
  useEffect(() => {
    const instance = view.current;
    if (!instance) return;
    const current = instance.state.doc.toString();
    if (current === value) return;
    instance.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({
      effects: languageCompartment.current.reconfigure(languageExtension(language)),
    });
  }, [language]);

  useEffect(() => {
    view.current?.dispatch({
      effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly]);

  return <div ref={host} className={fillHeight ? 'h-full' : undefined} />;
}

function normaliseType(type?: string): string | undefined {
  if (!type) return undefined;
  const map: Record<string, string> = {
    function: 'function',
    instance: 'variable',
    module: 'namespace',
    class: 'class',
    keyword: 'keyword',
    statement: 'variable',
    path: 'text',
    magic: 'keyword',
    param: 'property',
  };
  return map[type] ?? 'variable';
}

/** Imperative focus helper for parents that own selection state. */
export function focusEditor(container: HTMLElement | null) {
  const editable = container?.querySelector<HTMLElement>('.cm-content');
  editable?.focus();
}
