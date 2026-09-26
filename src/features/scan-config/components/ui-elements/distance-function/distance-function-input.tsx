'use client';

import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { type Diagnostic, forceLinting, linter } from '@codemirror/lint';
import { Compartment, EditorState } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import { useEffect, useRef, useState } from 'react';

import { validateDistanceFunction } from '@/features/scan-config/components/ui-elements/distance-function/validate';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { cn } from '@/utils/css-class';

export interface DistanceFunctionInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Extra placeholder names the function may use, beyond {value}/{distance}. */
  declaredParameters?: readonly string[];
}

// Build a linter bound to a specific set of declared parameters. Rebuilt (via a Compartment)
// whenever the parameters change so the inline squiggle re-runs, matching the red-outline state.
function makeDistanceLinter(params: readonly string[]) {
  return linter((view): Diagnostic[] => {
    const text = view.state.doc.toString();
    if (text.trim().length === 0) return [];
    const error = validateDistanceFunction(text, params);
    if (!error) return [];
    return [
      {
        from: Math.min(error.from, text.length),
        to: Math.min(Math.max(error.to, error.from + 1), text.length),
        severity: 'error',
        message: error.message,
      },
    ];
  });
}

// can see at a glance which variables and math calls they referenced. No full grammar needed.
const PLACEHOLDER_RE = /\{\w+\}/g;
const FUNCTION_RE = /\b(?:math|Math)\.\w+|\b(?:int|float|abs|min|max)\b/g;

const placeholderMark = Decoration.mark({ class: 'cm-distance-placeholder' });
const functionMark = Decoration.mark({ class: 'cm-distance-function' });

function buildDecorations(view: EditorView): DecorationSet {
  const text = view.state.doc.toString();
  const marks: ReturnType<typeof placeholderMark.range>[] = [];
  for (const match of text.matchAll(PLACEHOLDER_RE)) {
    marks.push(placeholderMark.range(match.index, match.index + match[0].length));
  }
  for (const match of text.matchAll(FUNCTION_RE)) {
    marks.push(functionMark.range(match.index, match.index + match[0].length));
  }
  marks.sort((a, b) => a.from - b.from);
  return Decoration.set(marks);
}

const highlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations }
);

const editorTheme = EditorView.theme({
  '&': { fontSize: '13px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-content': { fontFamily: 'monospace', padding: '6px 8px' },
  '.cm-distance-placeholder': { color: '#0958d9', fontWeight: '600' },
  '.cm-distance-function': { color: '#08979c' },
});

export function DistanceFunctionInput({
  value,
  onChange,
  disabled = false,
  declaredParameters = [],
}: DistanceFunctionInputProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Compartment lets us swap the linter (rebuilt with new parameters) without recreating the editor.
  const linterCompartment = useRef(new Compartment());
  // Keep the latest onChange in a ref so the editor is created once, not re-created per render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Same for the declared parameters, so the linter reads current values without recreating the editor.
  const paramsRef = useRef(declaredParameters);
  paramsRef.current = declaredParameters;
  // Validation is synchronous, so drive the red outline from React state directly rather than
  // waiting for CodeMirror's debounced linter (which only controls the inline squiggle).
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    value.trim().length === 0
      ? null
      : (validateDistanceFunction(value, declaredParameters)?.message ?? null)
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: `value` seeds the initial doc only; a separate effect syncs later changes so editing state (cursor, undo) survives.
  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        highlightPlugin,
        linterCompartment.current.of(makeDistanceLinter(paramsRef.current)),
        editorTheme,
        EditorView.lineWrapping,
        EditorState.readOnly.of(disabled),
        EditorView.editable.of(!disabled),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const text = update.state.doc.toString();
            onChangeRef.current(text);
            setErrorMessage(
              text.trim().length === 0
                ? null
                : (validateDistanceFunction(text, paramsRef.current)?.message ?? null)
            );
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Editor is created once; disabled changes are rare and handled by recreating the editor.
  }, [disabled]);

  // Sync external value changes (e.g. loading a saved config) into the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
      setErrorMessage(
        value.trim().length === 0
          ? null
          : (validateDistanceFunction(value, paramsRef.current)?.message ?? null)
      );
    }
  }, [value]);

  // When declared parameters change (a parameter added/removed elsewhere), re-validate the
  // current text: recompute the red-outline state and swap the linter so CodeMirror re-runs it,
  // since the doc itself did not change and would not otherwise re-trigger linting.
  const paramsKey = declaredParameters.join('\u0000');
  // biome-ignore lint/correctness/useExhaustiveDependencies: paramsKey is the trigger; the body reads paramsRef.current for the current values.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const text = view.state.doc.toString();
    setErrorMessage(
      text.trim().length === 0
        ? null
        : (validateDistanceFunction(text, paramsRef.current)?.message ?? null)
    );
    view.dispatch({
      effects: linterCompartment.current.reconfigure(makeDistanceLinter(paramsRef.current)),
    });
    forceLinting(view);
  }, [paramsKey]);

  const hasError = errorMessage !== null;
  return (
    <div className="w-full">
      <div
        ref={hostRef}
        data-testid="scan-config-control"
        data-scan-config-block-element={ScanConfigUIElementDict.DistanceFunctionInput}
        aria-invalid={hasError}
        className={cn(
          'w-full rounded-md border transition-colors',
          hasError
            ? 'border-red-500 [&_.cm-focused]:border-red-500'
            : 'border-gray-300 [&_.cm-focused]:border-primary-8'
        )}
      />
      {hasError && (
        <p role="alert" className="mt-1 text-xs text-red-500">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
