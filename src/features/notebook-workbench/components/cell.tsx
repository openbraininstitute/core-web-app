'use client';

import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiCornerDownLeftLine,
  RiDeleteBin6Line,
  RiEyeLine,
  RiFileCopyLine,
  RiPlayFill,
  RiStopFill,
} from '@remixicon/react';
import { memo, useEffect, useRef, useState } from 'react';

import { Tooltip } from '@/features/notebook-workbench/ui/tooltip';
import { cn } from '@/utils/css-class';

import { CodeEditor } from './code-editor';
import { MarkdownView } from './markdown-view';
import { OutputArea } from './output';

import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Cell } from '@/features/notebook-workbench/notebook/model';
import type { EditorMode } from '@/features/notebook-workbench/notebook/use-notebook';

interface CellViewProps {
  cell: Cell;
  index: number;
  language: string;
  active: boolean;
  selected: boolean;
  mode: EditorMode;
  kernel: any;
  onFocus: (append: boolean) => void;
  onSourceChange: (source: string) => void;
  onRun: () => void;
  onRunSelect: () => void;
  onRunInsert: () => void;
  onEnterEdit: () => void;
  onLeaveEdit: () => void;
  onArrowOut: (direction: -1 | 1) => void;
  onSave: () => void;
  onSplit: (offset: number) => void;
  onMergeBack: () => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleOutputs: () => void;
  onStdinReply: (value: string) => void;
  onInterrupt: () => void;
}

function PromptLabel({ cell }: { cell: Cell }) {
  if (cell.type !== 'code') {
    return (
      <span className="text-neutral-3 font-mono text-[10px] tracking-widest uppercase">
        {cell.type === 'markdown' ? 'md' : 'raw'}
      </span>
    );
  }
  if (cell.running) {
    return (
      <span className="text-primary-5 font-mono text-[11px] font-semibold">
        [<span className="animate-pulse">*</span>]
      </span>
    );
  }
  if (cell.pending) {
    return <span className="text-neutral-3 font-mono text-[11px]">[…]</span>;
  }
  return (
    <span className="text-neutral-3 font-mono text-[11px]">[{cell.executionCount ?? ' '}]</span>
  );
}

function StdinPrompt({
  prompt,
  password,
  onSubmit,
}: {
  prompt: string;
  password: boolean;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const submit = () => {
    onSubmit(value);
    setValue('');
  };

  return (
    <div className="border-primary-2 bg-primary-0 flex items-center gap-2 rounded-md border px-3 py-2">
      <span className="text-primary-8 font-mono text-xs whitespace-pre">{prompt || 'Input:'}</span>
      <input
        ref={ref}
        type={password ? 'password' : 'text'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e: ReactKeyboardEvent<HTMLInputElement>) => {
          e.stopPropagation();
          if (e.key === 'Enter') submit();
        }}
        className="text-primary-9 min-w-0 flex-1 border-b border-primary-3 bg-transparent font-mono text-xs outline-none"
      />
      <button
        type="button"
        onClick={submit}
        className="text-primary-6 hover:text-primary-9 shrink-0"
        aria-label="Submit input"
      >
        <RiCornerDownLeftLine className="size-3.5" />
      </button>
    </div>
  );
}

function CellToolbar({
  cell,
  onRun,
  onInterrupt,
  onMove,
  onDuplicate,
  onDelete,
}: Pick<CellViewProps, 'cell' | 'onRun' | 'onInterrupt' | 'onMove' | 'onDuplicate' | 'onDelete'>) {
  const iconClass =
    'text-neutral-4 hover:text-primary-9 hover:bg-neutral-1 rounded p-1 transition-colors';

  return (
    <div className="border-neutral-2 flex items-center gap-0.5 rounded-md border bg-white px-1 py-0.5 shadow-lift">
      <Tooltip label={cell.running ? 'Interrupt' : 'Run cell'} side="top">
        <button
          type="button"
          className={iconClass}
          onClick={cell.running ? onInterrupt : onRun}
          aria-label={cell.running ? 'Interrupt' : 'Run cell'}
        >
          {cell.running ? (
            <RiStopFill className="text-destructive size-3.5" />
          ) : (
            <RiPlayFill className="size-3.5" />
          )}
        </button>
      </Tooltip>
      <Tooltip label="Move up" side="top">
        <button type="button" className={iconClass} onClick={() => onMove(-1)} aria-label="Move up">
          <RiArrowUpLine className="size-3.5" />
        </button>
      </Tooltip>
      <Tooltip label="Move down" side="top">
        <button
          type="button"
          className={iconClass}
          onClick={() => onMove(1)}
          aria-label="Move down"
        >
          <RiArrowDownLine className="size-3.5" />
        </button>
      </Tooltip>
      <Tooltip label="Duplicate" side="top">
        <button
          type="button"
          className={iconClass}
          onClick={onDuplicate}
          aria-label="Duplicate cell"
        >
          <RiFileCopyLine className="size-3.5" />
        </button>
      </Tooltip>
      <Tooltip label="Delete" side="top">
        <button
          type="button"
          className={cn(iconClass, 'hover:text-destructive hover:bg-destructive/10')}
          onClick={onDelete}
          aria-label="Delete cell"
        >
          <RiDeleteBin6Line className="size-3.5" />
        </button>
      </Tooltip>
    </div>
  );
}

function CellViewImpl(props: CellViewProps) {
  const {
    cell,
    language,
    active,
    selected,
    mode,
    kernel,
    onFocus,
    onSourceChange,
    onRun,
    onRunSelect,
    onRunInsert,
    onEnterEdit,
    onLeaveEdit,
    onArrowOut,
    onSave,
    onSplit,
    onMergeBack,
    onMove,
    onDuplicate,
    onDelete,
    onToggleOutputs,
    onStdinReply,
    onInterrupt,
  } = props;

  const container = useRef<HTMLDivElement>(null);
  const editing = active && mode === 'edit';
  const isMarkdown = cell.type === 'markdown';
  const showRendered = cell.type !== 'code' && cell.rendered && !editing;

  useEffect(() => {
    if (active && container.current) {
      const rect = container.current.getBoundingClientRect();
      if (rect.top < 90 || rect.bottom > window.innerHeight - 20) {
        container.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [active]);

  const editorLanguage =
    cell.type === 'markdown' ? 'markdown' : language === 'python' ? 'python' : 'text';

  return (
    <div
      ref={container}
      data-cell-id={cell.id}
      className={cn(
        'group relative flex gap-2 px-1 py-1',
        selected && !active && 'bg-primary-0/40'
      )}
      onMouseDown={(event) => {
        if (!active) onFocus(event.shiftKey);
      }}
    >
      {/* Selection rail — the one persistent indicator of focus and state. */}
      <div className="flex w-11 shrink-0 flex-col items-end gap-1 pt-2.5">
        <div className="flex items-center gap-1.5">
          <PromptLabel cell={cell} />
          <span
            className={cn(
              'h-6 w-[3px] rounded-full transition-colors duration-200',
              cell.running
                ? 'bg-primary-5 animate-pulse'
                : active
                  ? mode === 'edit'
                    ? 'bg-primary-5'
                    : 'bg-primary-9'
                  : selected
                    ? 'bg-primary-3'
                    : 'bg-transparent group-hover:bg-neutral-2'
            )}
          />
        </div>
        {cell.durationMs != null && cell.type === 'code' ? (
          <span className="text-neutral-3 pr-2.5 font-mono text-[10px] tabular-nums">
            {formatDuration(cell.durationMs)}
          </span>
        ) : null}
      </div>

      <div className="relative min-w-0 flex-1 pb-1">
        <div className="absolute -top-2 right-1 z-20 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
          <CellToolbar
            cell={cell}
            onRun={onRun}
            onInterrupt={onInterrupt}
            onMove={onMove}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        </div>

        {showRendered ? (
          <button
            type="button"
            onDoubleClick={onEnterEdit}
            onClick={() => onFocus(false)}
            className={cn(
              'block w-full cursor-text rounded-lg border px-4 py-2 text-left transition-colors',
              isMarkdown ? 'md-body' : 'font-mono text-xs whitespace-pre-wrap',
              active
                ? 'border-primary-2 bg-primary-0/30'
                : 'border-transparent hover:border-neutral-2 hover:bg-neutral-1/40'
            )}
          >
            {isMarkdown ? (
              <MarkdownView source={cell.source} />
            ) : (
              <span className="text-neutral-4">{cell.source || 'Empty raw cell'}</span>
            )}
          </button>
        ) : (
          // biome-ignore lint/a11y/useKeyWithClickEvents: focuses the CodeMirror editor inside, which is itself keyboard accessible
          <div
            className={cn(
              'overflow-hidden rounded-lg border bg-white transition-all duration-150',
              editing
                ? 'border-primary-5 ring-primary-5/15 ring-2'
                : active
                  ? 'border-primary-9'
                  : 'border-neutral-2 hover:border-neutral-3'
            )}
            onClick={() => {
              if (!editing) onEnterEdit();
            }}
          >
            <CodeEditor
              value={cell.source}
              language={editorLanguage}
              kernel={kernel}
              autoFocus={editing}
              onChange={onSourceChange}
              onRun={onRun}
              onRunSelect={onRunSelect}
              onRunInsert={onRunInsert}
              onEscape={onLeaveEdit}
              onArrowOut={onArrowOut}
              onSave={onSave}
              onSplit={onSplit}
              onMergeBack={onMergeBack}
            />
          </div>
        )}

        {cell.stdinPrompt ? (
          <div className="mt-2">
            <StdinPrompt
              prompt={cell.stdinPrompt.prompt}
              password={cell.stdinPrompt.password}
              onSubmit={onStdinReply}
            />
          </div>
        ) : null}

        {cell.type === 'code' && cell.outputs.length > 0 ? (
          <div className="mt-2">
            {cell.outputsCollapsed ? (
              <button
                type="button"
                onClick={onToggleOutputs}
                className="text-neutral-4 hover:text-primary-9 border-neutral-2 hover:border-primary-3 flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1 text-xs transition-colors"
              >
                <RiEyeLine className="size-3.5" />
                Show {cell.outputs.length} hidden output{cell.outputs.length > 1 ? 's' : ''}
              </button>
            ) : (
              <div className="group/out relative pl-1">
                <button
                  type="button"
                  onClick={onToggleOutputs}
                  aria-label="Collapse output"
                  className="text-neutral-3 hover:text-primary-9 hover:bg-neutral-1 absolute -top-1 right-1 z-10 rounded p-1 opacity-0 transition-opacity group-hover/out:opacity-100"
                >
                  <RiCloseLine className="size-3.5" />
                </button>
                <OutputArea outputs={cell.outputs} />
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  return `${minutes}m ${Math.round((ms % 60000) / 1000)}s`;
}

export const CellView = memo(CellViewImpl);
