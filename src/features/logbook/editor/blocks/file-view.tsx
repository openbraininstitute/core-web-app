import { useQuery } from '@tanstack/react-query';
import { NodeViewWrapper } from '@tiptap/react';
import { isNil, isNotNil } from 'es-toolkit';
import { useEffect, useState } from 'react';

import {
  fileTextQuery,
  findLogFile,
  logFilesQuery,
  shortPathOf,
} from '@/features/logbook/api/log-files';
import { FileLang, fileLangOf, fileLooks } from '@/features/logbook/blocks/kinds';
import { highlightLines } from '@/features/logbook/editor/shiki';
import { LinesSkeleton } from '@/features/logbook/elements/skeletons';
import { sizeOf } from '@/features/logbook/helpers';
import { useLogContext } from '@/features/logbook/log/context';
import { useUploading } from '@/features/logbook/log/uploads';

import type { NodeViewProps } from '@tiptap/react';
import type { IProject } from '@/features/logbook/auth/session';

const NOTE = 'px-[14px] py-[10px] text-[13px] text-neutral-4';

interface IToken {
  readonly content: string;
  readonly color?: string | undefined;
}

const LINE_NUMBER = 'w-12 flex-none pr-4 text-right text-line-num select-none';

// Plain until Shiki's grammar loads (or for types without one).
export function CodeView({ text, name }: { readonly text: string; readonly name: string }) {
  const [highlighted, setHighlighted] = useState<{
    readonly text: string;
    readonly name: string;
    readonly lines: readonly (readonly IToken[])[];
  } | null>(null);
  useEffect(() => {
    let shown = true;
    highlightLines(text, name)
      .then((lines) => {
        if (shown && isNotNil(lines)) setHighlighted({ text, name, lines });
      })
      .catch(() => undefined); // plain text is the fallback
    return () => {
      shown = false;
    };
  }, [text, name]);
  // Colours for older text are dropped at once, not after an effect.
  const tokens = highlighted?.text === text && highlighted.name === name ? highlighted.lines : null;
  const lines: readonly (readonly IToken[])[] =
    tokens ?? text.split('\n').map((line) => [{ content: line }]);
  return (
    <div className="overflow-x-auto px-0 py-[10px] [font:12.5px/20px_var(--font-mono)] text-neutral-7">
      {lines.map((line, index) => (
        <div key={index} className="flex whitespace-pre">
          <span className={LINE_NUMBER}>{index + 1}</span>
          <span>
            {line.length === 0 || (line.length === 1 && line[0]?.content === '')
              ? ' '
              : line.map((token, at) => (
                  <span key={at} style={isNil(token.color) ? undefined : { color: token.color }}>
                    {token.content}
                  </span>
                ))}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CsvTable({ text }: { readonly text: string }) {
  const [head = [], ...rows] = text
    .trim()
    .split('\n')
    .map((line) => line.split(','));
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[13px]">
        <thead>
          <tr>
            {head.map((cell, index) => (
              <th
                key={index}
                className="border-b border-block-border px-3 py-2 text-left text-[12px] font-bold text-neutral-4"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td
                  key={c}
                  className="border-t border-rule-softer px-3 py-[7px] [font:12px_var(--font-mono)] whitespace-nowrap text-neutral-7"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FileBody({
  logId,
  folderId,
  path,
  project,
  csv,
}: {
  readonly logId: string;
  readonly folderId: string;
  readonly path: string;
  readonly project: IProject;
  readonly csv: boolean;
}) {
  const text = useQuery(fileTextQuery(logId, folderId, path, project));
  if (text.isPending)
    return (
      <div className={NOTE}>
        <LinesSkeleton />
      </div>
    );
  if (text.isError) return <div className={NOTE}>The file could not be read.</div>;
  return csv ? <CsvTable text={text.data} /> : <CodeView text={text.data} name={path} />;
}

export const TEXT_LANGS = new Set<string>([
  FileLang.Python,
  FileLang.Csv,
  FileLang.Json,
  FileLang.Shell,
]);

export function FileView({ node, selected }: NodeViewProps) {
  const { project, logId } = useLogContext();
  const name = String(node.attrs['name']);
  const path = String(node.attrs['path']);
  const lang = fileLangOf(name);
  const look = fileLooks[lang];
  const files = useQuery(logFilesQuery(logId, project));
  const folderId = files.data?.folderId ?? null;
  const saved = isNil(files.data) ? null : findLogFile(files.data.files, path);
  const uploading = useUploading(path);
  const [open, setOpen] = useState(false);
  const csv = lang === FileLang.Csv;
  const viewable = isNotNil(saved) && isNotNil(folderId) && TEXT_LANGS.has(lang);

  const meta = [
    look.name,
    isNil(saved)
      ? uploading
        ? 'uploading…'
        : files.isPending
          ? null
          : 'not uploaded yet'
      : sizeOf(saved.size),
    shortPathOf(path),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <NodeViewWrapper
      className="mx-0 mt-[10px] mb-[14px] overflow-hidden rounded-[14px] border border-block-border bg-white text-primary-9"
      data-selected={selected}
      contentEditable={false}
    >
      <div className="flex items-center gap-3 py-[10px] pr-3 pl-[14px]">
        <span
          className="grid size-9 flex-none place-items-center rounded-[10px] text-[11px] font-bold tracking-[0.02em]"
          style={{ background: look.bg, color: look.fg }}
        >
          {look.badge}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate [font:600_13px/1.4_var(--font-mono)]">{name}</div>
          <div className="text-[12px] leading-[1.4] text-neutral-4">{meta}</div>
        </div>
        {viewable ? (
          <button
            type="button"
            className="h-8 flex-none rounded-full border-0 bg-fill-2 px-3 text-[13px] font-bold text-primary-9"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'Hide' : csv ? 'View table' : 'View code'}
          </button>
        ) : null}
      </div>
      {open && isNotNil(saved) && isNotNil(folderId) ? (
        <div className="border-t border-rule-softer bg-code-bg">
          <FileBody
            logId={logId}
            folderId={folderId}
            path={saved.path}
            project={project}
            csv={csv}
          />
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}
