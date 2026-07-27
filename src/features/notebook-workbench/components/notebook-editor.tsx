'use client';

import { RiAddLine, RiErrorWarningLine, RiMarkdownLine } from '@remixicon/react';
import { useCallback, useEffect, useRef } from 'react';

import { useAppNotification } from '@/components/notification';
import { useNotebook } from '@/features/notebook-workbench/notebook/use-notebook';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import { CellView } from './cell';
import { NotebookToolbar } from './toolbar';

/** Keys that only take effect in command mode, mirroring JupyterLab. */
const DOUBLE_KEY_WINDOW_MS = 800;

export function NotebookEditor({ path }: { path: string }) {
  const controller = useNotebook(path);
  const notification = useAppNotification();
  const scroller = useRef<HTMLDivElement>(null);
  const lastKey = useRef<{ key: string; at: number } | null>(null);
  const controllerRef = useRef(controller);
  controllerRef.current = controller;

  const save = useCallback(async () => {
    await controllerRef.current.save();
    if (!controllerRef.current.error) {
      notification.success({
        message: 'Notebook saved',
        key: 'notebook-saved',
        placement: 'topRight',
      });
    }
  }, [notification]);

  const appendCell = useCallback((type: 'code' | 'markdown') => {
    const c = controllerRef.current;
    const last = c.model.cells[c.model.cells.length - 1];
    c.insertCell('below', type, last?.id);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const c = controllerRef.current;
      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save();
        return;
      }

      // Everything below is command mode only; the editor owns its own keys.
      if (c.mode === 'edit') return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.closest('.cm-editor')) return;
      if (mod || event.altKey) return;

      const key = event.key;
      const now = Date.now();
      const previous = lastKey.current;
      const isRepeat = (candidate: string) =>
        previous?.key === candidate && now - previous.at < DOUBLE_KEY_WINDOW_MS;

      const handled = () => {
        event.preventDefault();
        lastKey.current = { key, at: now };
      };

      switch (key) {
        case 'Enter':
          handled();
          if (event.shiftKey) c.runCells(c.selectedIds);
          else c.setMode('edit');
          return;
        case 'ArrowUp':
        case 'k':
          handled();
          if (event.shiftKey && key === 'ArrowUp') {
            const cells = c.model.cells;
            const index = cells.findIndex((x) => x.id === c.activeId);
            if (index > 0) c.extendSelection(cells[index - 1].id);
          } else {
            c.moveActive(-1);
          }
          return;
        case 'ArrowDown':
        case 'j':
          handled();
          if (event.shiftKey && key === 'ArrowDown') {
            const cells = c.model.cells;
            const index = cells.findIndex((x) => x.id === c.activeId);
            if (index >= 0 && index < cells.length - 1) c.extendSelection(cells[index + 1].id);
          } else {
            c.moveActive(1);
          }
          return;
        case 'a':
          handled();
          c.insertCell('above');
          c.setMode('command');
          return;
        case 'b':
          handled();
          c.insertCell('below');
          c.setMode('command');
          return;
        case 'd':
          if (isRepeat('d')) {
            event.preventDefault();
            lastKey.current = null;
            c.deleteCells();
            return;
          }
          handled();
          return;
        case '0':
          if (isRepeat('0')) {
            event.preventDefault();
            lastKey.current = null;
            void c.session.restart();
            notification.success({
              message: 'Kernel restarting',
              key: 'kernel-restarting',
              placement: 'topRight',
            });
            return;
          }
          handled();
          return;
        case 'i':
          if (isRepeat('i')) {
            event.preventDefault();
            lastKey.current = null;
            void c.session.interrupt();
            notification.success({
              message: 'Kernel interrupted',
              key: 'kernel-interrupted',
              placement: 'topRight',
            });
            return;
          }
          handled();
          return;
        case 'm':
          handled();
          if (event.shiftKey) {
            if (c.activeId) c.mergeBelow(c.activeId);
          } else {
            c.setCellType('markdown');
          }
          return;
        case 'y':
          handled();
          c.setCellType('code');
          return;
        case 'r':
          handled();
          c.setCellType('raw');
          return;
        case 'c':
          handled();
          c.copyCells();
          return;
        case 'x':
          handled();
          c.cutCells();
          return;
        case 'v':
          handled();
          c.pasteCells(event.shiftKey ? 'above' : 'below');
          return;
        case 'z':
          handled();
          c.undoDelete();
          return;
        case 'o':
          handled();
          if (c.activeId) c.toggleOutputsCollapsed(c.activeId);
          return;
        default:
          lastKey.current = { key, at: now };
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [notification, save]);

  if (controller.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="border-neutral-2 border-t-primary-9 size-7 animate-spin rounded-full border-2" />
          <span className="text-neutral-4 text-xs tracking-wide uppercase">Loading notebook</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <NotebookToolbar controller={controller} />

      {controller.error ? (
        <div className="border-destructive/30 bg-destructive/6 text-destructive flex items-start gap-2 border-b px-4 py-2 text-xs">
          <RiErrorWarningLine className="mt-px size-4 shrink-0" />
          <span className="leading-relaxed">{controller.error}</span>
        </div>
      ) : null}

      <div
        ref={scroller}
        className="secondary-scrollbar flex-1 overflow-y-auto"
        onMouseDown={(event) => {
          // Clicking the empty gutter leaves edit mode, like JupyterLab.
          if (event.target === event.currentTarget) controller.setMode('command');
        }}
      >
        <div className="mx-auto w-full max-w-5xl px-4 py-4">
          {controller.model.cells.map((cell, index) => (
            <CellView
              key={cell.id}
              cell={cell}
              index={index}
              language={controller.language}
              active={cell.id === controller.activeId}
              selected={controller.selectedIds.includes(cell.id)}
              mode={controller.mode}
              kernel={controller.session.kernel}
              onFocus={(append) =>
                append ? controller.extendSelection(cell.id) : controller.setActive(cell.id)
              }
              onSourceChange={(source) => controller.updateSource(cell.id, source)}
              onRun={() => controller.runCells([cell.id])}
              onRunSelect={() => controller.runCells([cell.id], false)}
              onRunInsert={() => {
                controller.runCells([cell.id], false);
                controller.insertCell('below', 'code', cell.id);
              }}
              onEnterEdit={() => {
                controller.setActive(cell.id, 'edit');
                if (cell.type !== 'code') controller.setRendered(cell.id, false);
              }}
              onLeaveEdit={() => {
                controller.setMode('command');
                if (cell.type !== 'code') controller.setRendered(cell.id, true);
              }}
              onArrowOut={(direction) => {
                controller.setMode('command');
                controller.moveActive(direction);
              }}
              onSave={() => void save()}
              onSplit={(offset) => controller.splitCell(cell.id, offset)}
              onMergeBack={() => {
                const cells = controller.model.cells;
                const at = cells.findIndex((x) => x.id === cell.id);
                if (at > 0) {
                  controller.setActive(cells[at - 1].id, 'edit');
                  controller.mergeBelow(cells[at - 1].id);
                }
              }}
              onMove={(delta) => controller.moveCell(cell.id, delta)}
              onDuplicate={() => {
                controller.copyCells([cell.id]);
                controller.pasteCells('below', cell.id);
              }}
              onDelete={() => controller.deleteCells([cell.id])}
              onToggleOutputs={() => controller.toggleOutputsCollapsed(cell.id)}
              onStdinReply={(value) => controller.replyToStdin(cell.id, value)}
              onInterrupt={() => void controller.session.interrupt()}
            />
          ))}

          <div className="flex items-center gap-2 py-4 pl-13 opacity-60 transition-opacity hover:opacity-100">
            <Button size="sm" variant="outline" onClick={() => appendCell('code')}>
              <RiAddLine className="size-3.5" />
              Code
            </Button>
            <Button size="sm" variant="outline" onClick={() => appendCell('markdown')}>
              <RiMarkdownLine className="size-3.5" />
              Markdown
            </Button>
          </div>
        </div>
      </div>

      <StatusBar controller={controller} />
    </div>
  );
}

function StatusBar({ controller }: { controller: ReturnType<typeof useNotebook> }) {
  const { model, mode, dirty, lastSaved, activeId } = controller;
  const index = model.cells.findIndex((c) => c.id === activeId);

  return (
    <div className="border-neutral-2 text-neutral-4 flex items-center gap-4 border-t bg-white px-4 py-1.5 text-[11px]">
      <span
        className={cn(
          'rounded-full px-2 py-0.5 font-semibold tracking-wide uppercase',
          mode === 'edit' ? 'bg-primary-5 text-white' : 'bg-neutral-1 text-neutral-4'
        )}
      >
        {mode}
      </span>
      <span className="tabular-nums">
        Cell {index + 1} of {model.cells.length}
      </span>
      <span className="text-neutral-3">{controller.language}</span>
      <div className="flex-1" />
      {dirty ? (
        <span className="text-warning flex items-center gap-1.5 font-medium">
          <span className="bg-warning size-1.5 rounded-full" />
          Unsaved changes
        </span>
      ) : lastSaved ? (
        <span>Saved {lastSaved.toLocaleTimeString()}</span>
      ) : null}
    </div>
  );
}
