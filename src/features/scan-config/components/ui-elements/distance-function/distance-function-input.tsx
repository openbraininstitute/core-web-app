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

import {
  type TDistanceFunctionValidation,
  validateDistanceFunction,
} from '@/api/one/distance-function';
import { useFieldError } from '@/features/scan-config/components/hooks/field-errors';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { cn } from '@/utils/css-class';

export interface DistanceFunctionInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Extra placeholder names the function may use, beyond {value}/{distance}. */
  declaredParameters?: readonly string[];
  maxLength?: number;
  errorPath?: string;
}

const VALIDATE_DEBOUNCE_MS = 350;

// Highlighting: color `{placeholder}` tokens and known function names so the user can see at a
// glance which variables and math calls they referenced.
const PLACEHOLDER_RE = /\{\w+\}/g;
const FUNCTION_RE = /\bmath\.\w+|\b(?:float|abs|min|max)\b/g;

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

/** A linter that reports a single, already-computed server diagnostic (or none). */
function makeServerLinter(result: TDistanceFunctionValidation | null) {
  return linter((view): Diagnostic[] => {
    const len = view.state.doc.length;
    if (!result || result.valid || len === 0) return [];
    return [
      {
        from: Math.min(result.from, len),
        to: Math.min(Math.max(result.to, result.from + 1), len),
        severity: 'error',
        message: result.error ?? 'Invalid distance function.',
      },
    ];
  });
}

/** Apply a validation result to the editor (squiggle) and the red outline / message state. */
function applyResult(
  view: EditorView,
  compartment: Compartment,
  setErrorMessage: (msg: string | null) => void,
  result: TDistanceFunctionValidation | null
): void {
  setErrorMessage(result && !result.valid ? (result.error ?? 'Invalid distance function.') : null);
  view.dispatch({ effects: compartment.reconfigure(makeServerLinter(result)) });
  forceLinting(view);
}

export function DistanceFunctionInput({
  value,
  onChange,
  disabled = false,
  declaredParameters = [],
  maxLength,
  errorPath,
}: DistanceFunctionInputProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Compartment lets us swap the linter with the latest server result without recreating the editor.
  const linterCompartment = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Publish the error into the shared field-errors atom so the enclosing dictionary entry shows
  // the warning key. Cleared on unmount by the hook.
  useFieldError(errorPath, errorMessage ?? undefined);

  // Create the editor once. `value` seeds the initial doc; later external changes are synced below.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `value` is the initial doc only.
  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        highlightPlugin,
        linterCompartment.current.of(makeServerLinter(null)),
        editorTheme,
        EditorView.lineWrapping,
        EditorState.readOnly.of(disabled),
        EditorView.editable.of(!disabled),
        // Enforce max length: reject changes that would exceed it (schema `maxLength`).
        EditorState.changeFilter.of((tr) =>
          maxLength === undefined || tr.newDoc.length <= maxLength ? true : []
        ),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
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
  }, [disabled, maxLength]);

  // Sync external value changes (e.g. loading a saved config) into the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  // Debounced server validation, re-run when the value or declared parameters change.
  // `declaredParameters` is often a fresh array on each parent render, so depend on its joined
  // contents instead of its identity to avoid aborting and rescheduling the request every render.
  const declaredParametersKey = declaredParameters.join(',');
  // biome-ignore lint/correctness/useExhaustiveDependencies: declaredParametersKey tracks declaredParameters by value.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return undefined;
    const compartment = linterCompartment.current;
    if (value.trim().length === 0) {
      applyResult(view, compartment, setErrorMessage, null);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      validateDistanceFunction({
        function: value,
        parameters: declaredParameters,
        signal: controller.signal,
      })
        .then((result) => {
          const current = viewRef.current;
          if (current) applyResult(current, compartment, setErrorMessage, result);
        })
        .catch(() => {
          // Aborted or network error: leave the last state; do not block editing.
        });
    }, VALIDATE_DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value, declaredParametersKey]);

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
