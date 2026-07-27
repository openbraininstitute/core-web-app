import type * as nbformat from '@jupyterlab/nbformat';

export type CellType = 'code' | 'markdown' | 'raw';

export interface Cell {
  id: string;
  type: CellType;
  source: string;
  outputs: nbformat.IOutput[];
  executionCount: number | null;
  metadata: Record<string, any>;
  attachments?: Record<string, any>;
  /** Markdown/raw cells toggle between the rendered view and the editor. */
  rendered: boolean;
  /** Queued for execution but not yet started. */
  pending: boolean;
  /** Currently executing on the kernel. */
  running: boolean;
  /** Wall time of the last completed execution. */
  durationMs: number | null;
  /** Active `input()` prompt from the kernel, if any. */
  stdinPrompt: { prompt: string; password: boolean } | null;
  /** Collapsed output area. */
  outputsCollapsed: boolean;
}

export interface NotebookModel {
  cells: Cell[];
  metadata: Record<string, any>;
  nbformat: number;
  nbformatMinor: number;
}

let idCounter = 0;

export function newCellId(): string {
  idCounter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `c${idCounter}-${random}`;
}

function toText(source: string | string[] | undefined): string {
  if (source == null) return '';
  return Array.isArray(source) ? source.join('') : source;
}

/** nbformat stores multiline strings as line arrays, newline kept on each line. */
function toLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.split('\n');
  const trailingNewline = lines[lines.length - 1] === '';
  if (trailingNewline) lines.pop();
  return lines.map((line, i) => (i === lines.length - 1 && !trailingNewline ? line : `${line}\n`));
}

export function createCell(type: CellType, source = ''): Cell {
  return {
    id: newCellId(),
    type,
    source,
    outputs: [],
    executionCount: null,
    metadata: {},
    rendered: type !== 'code' && source.trim() !== '',
    pending: false,
    running: false,
    durationMs: null,
    stdinPrompt: null,
    outputsCollapsed: false,
  };
}

export function emptyNotebook(kernelName = 'python3', language = 'python'): NotebookModel {
  return {
    cells: [createCell('code')],
    metadata: {
      kernelspec: { name: kernelName, display_name: kernelName, language },
      language_info: { name: language },
    },
    nbformat: 4,
    nbformatMinor: 5,
  };
}

export function parseNotebook(raw: any): NotebookModel {
  const cells: Cell[] = Array.isArray(raw?.cells)
    ? raw.cells.map((cell: any) => {
        const type: CellType =
          cell.cell_type === 'markdown' || cell.cell_type === 'raw' ? cell.cell_type : 'code';
        const source = toText(cell.source);
        return {
          id: typeof cell.id === 'string' && cell.id ? cell.id : newCellId(),
          type,
          source,
          outputs: type === 'code' && Array.isArray(cell.outputs) ? cell.outputs : [],
          executionCount: type === 'code' ? (cell.execution_count ?? null) : null,
          metadata: cell.metadata ?? {},
          attachments: cell.attachments,
          rendered: type !== 'code' && source.trim() !== '',
          pending: false,
          running: false,
          durationMs: null,
          stdinPrompt: null,
          outputsCollapsed: Boolean(cell.metadata?.collapsed),
        } satisfies Cell;
      })
    : [];

  return {
    cells: cells.length > 0 ? cells : [createCell('code')],
    metadata: raw?.metadata ?? {},
    nbformat: raw?.nbformat ?? 4,
    nbformatMinor: raw?.nbformat_minor ?? 5,
  };
}

export function serializeNotebook(model: NotebookModel): nbformat.INotebookContent {
  return {
    cells: model.cells.map((cell) => {
      const metadata = { ...cell.metadata };
      if (cell.outputsCollapsed) metadata.collapsed = true;
      else delete metadata.collapsed;

      const base: any = {
        cell_type: cell.type,
        id: cell.id,
        metadata,
        source: toLines(cell.source),
      };
      if (cell.type === 'code') {
        base.outputs = cell.outputs;
        base.execution_count = cell.executionCount;
      }
      if (cell.attachments) base.attachments = cell.attachments;
      return base;
    }),
    metadata: model.metadata as any,
    nbformat: model.nbformat,
    nbformat_minor: model.nbformatMinor,
  };
}

export function notebookLanguage(model: NotebookModel): string {
  return model.metadata?.language_info?.name ?? model.metadata?.kernelspec?.language ?? 'python';
}

/* -------------------------------------------------------------------------- */
/*                              Output accumulation                            */
/* -------------------------------------------------------------------------- */

/**
 * Mirrors JupyterLab's OutputArea semantics: consecutive stream messages on the
 * same channel coalesce into one output, and `\r` rewrites the current line so
 * progress bars render as a single line rather than hundreds.
 */
export function appendOutput(
  outputs: nbformat.IOutput[],
  incoming: nbformat.IOutput
): nbformat.IOutput[] {
  if (incoming.output_type === 'stream') {
    const last = outputs[outputs.length - 1];
    if (last?.output_type === 'stream' && last.name === incoming.name) {
      const merged = collapseCarriageReturns(
        toText(last.text as any) + toText(incoming.text as any)
      );
      return [...outputs.slice(0, -1), { ...last, text: merged }];
    }
    return [
      ...outputs,
      { ...incoming, text: collapseCarriageReturns(toText(incoming.text as any)) },
    ];
  }
  return [...outputs, incoming];
}

function collapseCarriageReturns(text: string): string {
  if (!text.includes('\r')) return text;
  const lines = text.split('\n');
  const out = lines.map((line) => {
    if (!line.includes('\r')) return line;
    // Each \r returns the cursor to column 0; later text overwrites earlier text.
    let result = '';
    for (const chunk of line.split('\r')) {
      result = chunk.length >= result.length ? chunk : chunk + result.slice(chunk.length);
    }
    return result;
  });
  return out.join('\n');
}

/** Replaces an output previously published under `display_id`. */
export function updateDisplay(
  outputs: nbformat.IOutput[],
  displayId: string,
  next: nbformat.IOutput
): nbformat.IOutput[] {
  let changed = false;
  const updated = outputs.map((output) => {
    const id = (output.transient as any)?.display_id;
    if (id === displayId) {
      changed = true;
      return { ...next, transient: { display_id: displayId } };
    }
    return output;
  });
  return changed ? updated : outputs;
}

export function outputToText(output: nbformat.IOutput): string {
  if (output.output_type === 'stream') return toText(output.text as any);
  if (output.output_type === 'error') {
    const traceback = (output.traceback as string[] | undefined) ?? [];
    return traceback.length > 0 ? traceback.join('\n') : `${output.ename}: ${output.evalue}`;
  }
  const data = ((output as any).data ?? {}) as Record<string, any>;
  if (data['text/plain']) return toText(data['text/plain']);
  return '';
}

export { toText as sourceToText };
