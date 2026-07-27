'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useServices } from '@/features/notebook-workbench/jupyter/context';
import { type SessionHandle, useSession } from '@/features/notebook-workbench/jupyter/use-session';

import {
  appendOutput,
  type Cell,
  type CellType,
  createCell,
  emptyNotebook,
  type NotebookModel,
  newCellId,
  notebookLanguage,
  parseNotebook,
  serializeNotebook,
  updateDisplay,
} from './model';

import type { Kernel, KernelMessage } from '@jupyterlab/services';

export type EditorMode = 'command' | 'edit';

/** Cut/copied cells persist across notebooks, as in JupyterLab. */
let clipboard: Cell[] = [];

export interface NotebookController {
  model: NotebookModel;
  language: string;
  loading: boolean;
  error: string | null;
  dirty: boolean;
  saving: boolean;
  lastSaved: Date | null;
  activeId: string | null;
  selectedIds: string[];
  mode: EditorMode;
  busy: boolean;
  session: SessionHandle;

  setActive: (id: string, mode?: EditorMode) => void;
  extendSelection: (id: string) => void;
  setMode: (mode: EditorMode) => void;
  moveActive: (delta: number) => void;

  updateSource: (id: string, source: string) => void;
  setCellType: (type: CellType, ids?: string[]) => void;
  setRendered: (id: string, rendered: boolean) => void;
  toggleOutputsCollapsed: (id: string) => void;

  /** `anchorId` defaults to the active cell; pass it when the caller has just
   *  changed selection, since that state change is not yet visible here. */
  insertCell: (where: 'above' | 'below', type?: CellType, anchorId?: string) => string;
  deleteCells: (ids?: string[]) => void;
  moveCell: (id: string, delta: number) => void;
  copyCells: (ids?: string[]) => void;
  cutCells: (ids?: string[]) => void;
  pasteCells: (where: 'above' | 'below', anchorId?: string) => void;
  undoDelete: () => void;
  canUndoDelete: boolean;
  splitCell: (id: string, offset: number) => void;
  mergeBelow: (id: string) => void;

  runCells: (ids: string[], advance?: boolean) => void;
  runAll: () => void;
  runAllAbove: (id: string) => void;
  runAllBelow: (id: string) => void;
  restartAndRunAll: () => Promise<void>;
  clearOutputs: (ids?: string[]) => void;
  clearAllOutputs: () => void;
  replyToStdin: (id: string, value: string) => void;

  save: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useNotebook(path: string): NotebookController {
  const [model, setModel] = useState<NotebookModel>(() => emptyNotebook());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mode, setMode] = useState<EditorMode>('command');
  const [busy, setBusy] = useState(false);
  const [undoStack, setUndoStack] = useState<{ cells: Cell[]; index: number }[]>([]);

  const services = useServices();
  const session = useSession(path, model.metadata?.kernelspec?.name);
  const modelRef = useRef(model);
  modelRef.current = model;
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const stdinRef = useRef<Map<string, KernelMessage.IInputRequestMsg>>(new Map());

  /* ------------------------------------------------------------------ load */

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const svc = services;
      await svc.ready;
      const file = await svc.contents.get(path, { content: true, type: 'notebook' });
      const parsed = parseNotebook(file.content);
      setModel(parsed);
      setActiveId(parsed.cells[0]?.id ?? null);
      setSelectedIds(parsed.cells[0] ? [parsed.cells[0].id] : []);
      setDirty(false);
      setLastSaved(file.last_modified ? new Date(file.last_modified) : null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [path, services]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ------------------------------------------------------------- mutations */

  const mutate = useCallback((fn: (draft: NotebookModel) => NotebookModel, markDirty = true) => {
    setModel((current) => {
      const next = fn(current);
      modelRef.current = next;
      return next;
    });
    if (markDirty) setDirty(true);
  }, []);

  const mapCell = useCallback(
    (id: string, fn: (cell: Cell) => Cell, markDirty = true) => {
      mutate((m) => ({ ...m, cells: m.cells.map((c) => (c.id === id ? fn(c) : c)) }), markDirty);
    },
    [mutate]
  );

  const targetIds = useCallback(
    (ids?: string[]) => {
      if (ids && ids.length > 0) return ids;
      if (selectedIds.length > 0) return selectedIds;
      return activeId ? [activeId] : [];
    },
    [activeId, selectedIds]
  );

  const setActive = useCallback((id: string, nextMode?: EditorMode) => {
    setActiveId(id);
    setSelectedIds([id]);
    if (nextMode) setMode(nextMode);
  }, []);

  const extendSelection = useCallback(
    (id: string) => {
      const cells = modelRef.current.cells;
      const anchor = cells.findIndex((c) => c.id === activeId);
      const target = cells.findIndex((c) => c.id === id);
      if (anchor < 0 || target < 0) return setActive(id);
      const [from, to] = anchor <= target ? [anchor, target] : [target, anchor];
      setSelectedIds(cells.slice(from, to + 1).map((c) => c.id));
    },
    [activeId, setActive]
  );

  const moveActive = useCallback(
    (delta: number) => {
      const cells = modelRef.current.cells;
      const index = cells.findIndex((c) => c.id === activeId);
      const next = cells[Math.min(cells.length - 1, Math.max(0, index + delta))];
      if (next) setActive(next.id);
    },
    [activeId, setActive]
  );

  const updateSource = useCallback(
    (id: string, source: string) => {
      mapCell(id, (c) => (c.source === source ? c : { ...c, source }));
    },
    [mapCell]
  );

  const setCellType = useCallback(
    (type: CellType, ids?: string[]) => {
      const list = targetIds(ids);
      mutate((m) => ({
        ...m,
        cells: m.cells.map((c) =>
          list.includes(c.id)
            ? {
                ...c,
                type,
                outputs: type === 'code' ? c.outputs : [],
                executionCount: type === 'code' ? c.executionCount : null,
                rendered: type === 'code' ? false : c.source.trim() !== '',
              }
            : c
        ),
      }));
    },
    [mutate, targetIds]
  );

  const setRendered = useCallback(
    (id: string, rendered: boolean) => mapCell(id, (c) => ({ ...c, rendered }), false),
    [mapCell]
  );

  const toggleOutputsCollapsed = useCallback(
    (id: string) => mapCell(id, (c) => ({ ...c, outputsCollapsed: !c.outputsCollapsed })),
    [mapCell]
  );

  /* ------------------------------------------------------------- structure */

  const insertCell = useCallback(
    (where: 'above' | 'below', type: CellType = 'code', anchorId?: string) => {
      const cell = createCell(type);
      const anchor = anchorId ?? activeId;
      mutate((m) => {
        const index = m.cells.findIndex((c) => c.id === anchor);
        const at = index < 0 ? m.cells.length : where === 'above' ? index : index + 1;
        const cells = [...m.cells];
        cells.splice(at, 0, cell);
        return { ...m, cells };
      });
      setActiveId(cell.id);
      setSelectedIds([cell.id]);
      setMode('edit');
      return cell.id;
    },
    [activeId, mutate]
  );

  const deleteCells = useCallback(
    (ids?: string[]) => {
      const list = targetIds(ids);
      if (list.length === 0) return;
      const cells = modelRef.current.cells;
      const index = cells.findIndex((c) => c.id === list[0]);
      const removed = cells.filter((c) => list.includes(c.id));
      if (removed.length === 0) return;
      setUndoStack((s) => [...s.slice(-19), { cells: removed, index }]);

      let remaining = cells.filter((c) => !list.includes(c.id));
      if (remaining.length === 0) remaining = [createCell('code')];
      mutate((m) => ({ ...m, cells: remaining }));

      const focus = remaining[Math.min(index, remaining.length - 1)];
      if (focus) {
        setActiveId(focus.id);
        setSelectedIds([focus.id]);
      }
    },
    [mutate, targetIds]
  );

  const undoDelete = useCallback(() => {
    setUndoStack((stack) => {
      const entry = stack[stack.length - 1];
      if (!entry) return stack;
      mutate((m) => {
        const cells = [...m.cells];
        cells.splice(Math.min(entry.index, cells.length), 0, ...entry.cells);
        return { ...m, cells };
      });
      const first = entry.cells[0];
      if (first) {
        setActiveId(first.id);
        setSelectedIds(entry.cells.map((c) => c.id));
      }
      return stack.slice(0, -1);
    });
  }, [mutate]);

  const moveCell = useCallback(
    (id: string, delta: number) => {
      mutate((m) => {
        const index = m.cells.findIndex((c) => c.id === id);
        const to = index + delta;
        if (index < 0 || to < 0 || to >= m.cells.length) return m;
        const cells = [...m.cells];
        const [moved] = cells.splice(index, 1);
        cells.splice(to, 0, moved);
        return { ...m, cells };
      });
    },
    [mutate]
  );

  const copyCells = useCallback(
    (ids?: string[]) => {
      const list = targetIds(ids);
      clipboard = modelRef.current.cells
        .filter((c) => list.includes(c.id))
        .map((c) => ({ ...c, id: newCellId() }));
    },
    [targetIds]
  );

  const cutCells = useCallback(
    (ids?: string[]) => {
      copyCells(ids);
      deleteCells(ids);
    },
    [copyCells, deleteCells]
  );

  const pasteCells = useCallback(
    (where: 'above' | 'below', anchorId?: string) => {
      if (clipboard.length === 0) return;
      const fresh = clipboard.map((c) => ({ ...c, id: newCellId() }));
      const anchor = anchorId ?? activeId;
      mutate((m) => {
        const index = m.cells.findIndex((c) => c.id === anchor);
        const at = index < 0 ? m.cells.length : where === 'above' ? index : index + 1;
        const cells = [...m.cells];
        cells.splice(at, 0, ...fresh);
        return { ...m, cells };
      });
      setActiveId(fresh[0].id);
      setSelectedIds(fresh.map((c) => c.id));
    },
    [activeId, mutate]
  );

  const splitCell = useCallback(
    (id: string, offset: number) => {
      const cell = modelRef.current.cells.find((c) => c.id === id);
      if (!cell) return;
      const head = cell.source.slice(0, offset);
      const tail = cell.source.slice(offset);
      const created = { ...createCell(cell.type, tail), rendered: false };
      mutate((m) => {
        const index = m.cells.findIndex((c) => c.id === id);
        const cells = [...m.cells];
        cells[index] = { ...cell, source: head, outputs: [], executionCount: null };
        cells.splice(index + 1, 0, created);
        return { ...m, cells };
      });
      setActiveId(created.id);
      setSelectedIds([created.id]);
    },
    [mutate]
  );

  const mergeBelow = useCallback(
    (id: string) => {
      mutate((m) => {
        const index = m.cells.findIndex((c) => c.id === id);
        const current = m.cells[index];
        const next = m.cells[index + 1];
        if (!current || !next) return m;
        const cells = [...m.cells];
        cells[index] = {
          ...current,
          source: `${current.source}\n${next.source}`,
          outputs: [],
          executionCount: null,
          rendered: false,
        };
        cells.splice(index + 1, 1);
        return { ...m, cells };
      });
    },
    [mutate]
  );

  /* ------------------------------------------------------------- execution */

  const clearOutputs = useCallback(
    (ids?: string[]) => {
      const list = targetIds(ids);
      mutate((m) => ({
        ...m,
        cells: m.cells.map((c) =>
          list.includes(c.id) ? { ...c, outputs: [], executionCount: null, durationMs: null } : c
        ),
      }));
    },
    [mutate, targetIds]
  );

  const clearAllOutputs = useCallback(() => {
    mutate((m) => ({
      ...m,
      cells: m.cells.map((c) => ({
        ...c,
        outputs: [],
        executionCount: null,
        durationMs: null,
      })),
    }));
  }, [mutate]);

  const ensureKernel = useCallback(async (): Promise<Kernel.IKernelConnection | null> => {
    if (session.kernel) return session.kernel;
    await session.start();
    // `session.kernel` is captured from the previous render; read through the
    // service manager instead so the first run after a cold start still works.
    const svc = services;
    const found = await svc.sessions.findByPath(path);
    if (!found) return null;
    return svc.sessions.connectTo({ model: found }).kernel;
  }, [path, services, session]);

  const executeCell = useCallback(
    async (id: string) => {
      const cell = modelRef.current.cells.find((c) => c.id === id);
      if (!cell) return;

      if (cell.type === 'markdown' || cell.type === 'raw') {
        mapCell(id, (c) => ({ ...c, rendered: true, pending: false }), false);
        return;
      }
      if (!cell.source.trim()) {
        mapCell(id, (c) => ({ ...c, pending: false, executionCount: null }), false);
        return;
      }

      const kernel = await ensureKernel();
      if (!kernel) {
        mapCell(id, (c) => ({ ...c, pending: false, running: false }), false);
        setError('No kernel available. Check that the Jupyter server is running.');
        return;
      }

      const startedAt = Date.now();
      mapCell(id, (c) => ({
        ...c,
        outputs: [],
        running: true,
        pending: false,
        executionCount: null,
        durationMs: null,
        stdinPrompt: null,
      }));

      // `clear_output(wait=True)` defers the clear until the next output lands.
      let clearPending = false;
      const push = (output: any) => {
        mapCell(id, (c) => {
          const base = clearPending ? [] : c.outputs;
          clearPending = false;
          return { ...c, outputs: appendOutput(base, output) };
        });
      };

      const future = kernel.requestExecute(
        { code: cell.source, allow_stdin: true, stop_on_error: false },
        false
      );

      future.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
        const type = msg.header.msg_type;
        const content = msg.content as any;

        switch (type) {
          case 'execute_input':
            mapCell(id, (c) => ({ ...c, executionCount: content.execution_count ?? null }), false);
            break;
          case 'stream':
            push({ output_type: 'stream', name: content.name, text: content.text });
            break;
          case 'execute_result':
            push({
              output_type: 'execute_result',
              data: content.data,
              metadata: content.metadata ?? {},
              execution_count: content.execution_count ?? null,
            });
            break;
          case 'display_data':
            push({
              output_type: 'display_data',
              data: content.data,
              metadata: content.metadata ?? {},
              ...(content.transient?.display_id
                ? { transient: { display_id: content.transient.display_id } }
                : {}),
            });
            break;
          case 'update_display_data': {
            const displayId = content.transient?.display_id;
            if (!displayId) break;
            mapCell(id, (c) => ({
              ...c,
              outputs: updateDisplay(c.outputs, displayId, {
                output_type: 'display_data',
                data: content.data,
                metadata: content.metadata ?? {},
              } as any),
            }));
            break;
          }
          case 'error':
            push({
              output_type: 'error',
              ename: content.ename,
              evalue: content.evalue,
              traceback: content.traceback ?? [],
            });
            break;
          case 'clear_output':
            if (content.wait) clearPending = true;
            else mapCell(id, (c) => ({ ...c, outputs: [] }));
            break;
          default:
            break;
        }
      };

      future.onStdin = (msg: KernelMessage.IStdinMessage) => {
        if (msg.header.msg_type !== 'input_request') return;
        const request = msg as KernelMessage.IInputRequestMsg;
        stdinRef.current.set(id, request);
        mapCell(
          id,
          (c) => ({
            ...c,
            stdinPrompt: {
              prompt: request.content.prompt || '',
              password: Boolean(request.content.password),
            },
          }),
          false
        );
      };

      try {
        await future.done;
      } catch {
        // A restart or interrupt rejects the future; cell state is reset below.
      } finally {
        future.dispose();
        stdinRef.current.delete(id);
        mapCell(
          id,
          (c) => ({
            ...c,
            running: false,
            pending: false,
            stdinPrompt: null,
            durationMs: Date.now() - startedAt,
          }),
          false
        );
      }
    },
    [ensureKernel, mapCell]
  );

  const runCells = useCallback(
    (ids: string[], advance = true) => {
      if (ids.length === 0) return;

      mutate(
        (m) => ({
          ...m,
          cells: m.cells.map((c) =>
            ids.includes(c.id) && c.type === 'code' ? { ...c, pending: true } : c
          ),
        }),
        false
      );

      setBusy(true);
      for (const id of ids) {
        queueRef.current = queueRef.current.then(
          () => executeCell(id),
          () => executeCell(id)
        );
      }
      queueRef.current = queueRef.current.finally(() => setBusy(false));

      if (advance) {
        const cells = modelRef.current.cells;
        const lastIndex = cells.findIndex((c) => c.id === ids[ids.length - 1]);
        const next = cells[lastIndex + 1];
        if (next) {
          setActiveId(next.id);
          setSelectedIds([next.id]);
        }
        setMode('command');
      }
    },
    [executeCell, mutate]
  );

  const runAll = useCallback(() => {
    runCells(
      modelRef.current.cells.map((c) => c.id),
      false
    );
  }, [runCells]);

  const runAllAbove = useCallback(
    (id: string) => {
      const cells = modelRef.current.cells;
      const index = cells.findIndex((c) => c.id === id);
      runCells(
        cells.slice(0, index).map((c) => c.id),
        false
      );
    },
    [runCells]
  );

  const runAllBelow = useCallback(
    (id: string) => {
      const cells = modelRef.current.cells;
      const index = cells.findIndex((c) => c.id === id);
      runCells(
        cells.slice(index).map((c) => c.id),
        false
      );
    },
    [runCells]
  );

  const restartAndRunAll = useCallback(async () => {
    await session.restart();
    runAll();
  }, [runAll, session]);

  const replyToStdin = useCallback(
    (id: string, value: string) => {
      const request = stdinRef.current.get(id);
      const kernel = session.kernel;
      if (!request || !kernel) return;
      kernel.sendInputReply({ status: 'ok', value }, request.header as any);
      stdinRef.current.delete(id);
      mapCell(id, (c) => ({ ...c, stdinPrompt: null }), false);
    },
    [mapCell, session.kernel]
  );

  /* -------------------------------------------------------------- persist */

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const svc = services;
      await svc.contents.save(path, {
        type: 'notebook',
        format: 'json',
        content: serializeNotebook(modelRef.current),
      });
      setDirty(false);
      setLastSaved(new Date());
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }, [path, services]);

  // Warn before losing unsaved edits on reload/close.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  return {
    model,
    language: notebookLanguage(model),
    loading,
    error: error ?? session.error,
    dirty,
    saving,
    lastSaved,
    activeId,
    selectedIds,
    mode,
    busy,
    session,
    setActive,
    extendSelection,
    setMode,
    moveActive,
    updateSource,
    setCellType,
    setRendered,
    toggleOutputsCollapsed,
    insertCell,
    deleteCells,
    moveCell,
    copyCells,
    cutCells,
    pasteCells,
    undoDelete,
    canUndoDelete: undoStack.length > 0,
    splitCell,
    mergeBelow,
    runCells,
    runAll,
    runAllAbove,
    runAllBelow,
    restartAndRunAll,
    clearOutputs,
    clearAllOutputs,
    replyToStdin,
    save,
    reload: load,
  };
}
