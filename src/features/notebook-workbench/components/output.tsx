'use client';

import Anser from 'anser';
import { useEffect, useMemo, useRef } from 'react';

import { cn } from '@/utils/css-class';

import type * as nbformat from '@jupyterlab/nbformat';

/* --------------------------------------------------------------------- ANSI */

/** Terminal palette mapped onto the OBI colours so tracebacks stay on-brand. */
const ANSI_OVERRIDES: Record<string, string> = {
  '187, 0, 0': '#eb3333',
  '255, 85, 85': '#ff4d4f',
  '0, 187, 0': '#389e0d',
  '85, 255, 85': '#52c41a',
  '187, 187, 0': '#cb5c00',
  '255, 255, 85': '#d48806',
  '0, 0, 187': '#0050b3',
  '85, 85, 255': '#1890ff',
  '187, 0, 187': '#9254de',
  '255, 85, 255': '#b37feb',
  '0, 187, 187': '#08979c',
  '85, 255, 255': '#13c2c2',
  '0, 0, 0': '#141414',
  '187, 187, 187': '#595959',
  '85, 85, 85': '#8c8c8c',
  '255, 255, 255': '#262626',
};

function ansiColor(value?: string | null): string | undefined {
  if (!value) return undefined;
  return ANSI_OVERRIDES[value] ?? `rgb(${value})`;
}

function AnsiText({ text, className }: { text: string; className?: string }) {
  const chunks = useMemo(
    () => Anser.ansiToJson(text, { json: true, remove_empty: true, use_classes: false }),
    [text]
  );

  return (
    <span className={className}>
      {chunks.map((chunk, index) => {
        const decorations = chunk.decorations ?? [];
        const style: React.CSSProperties = {
          color: ansiColor(chunk.fg),
          backgroundColor: chunk.bg ? `rgb(${chunk.bg})` : undefined,
          fontWeight: decorations.includes('bold') ? 600 : undefined,
          fontStyle: decorations.includes('italic') ? 'italic' : undefined,
          textDecoration: decorations.includes('underline') ? 'underline' : undefined,
        };
        const hasStyle = Object.values(style).some((v) => v !== undefined);
        return hasStyle ? (
          <span key={index} style={style}>
            {chunk.content}
          </span>
        ) : (
          <span key={index}>{chunk.content}</span>
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------------- HTML */

/**
 * Kernel HTML is rendered as-is minus script execution vectors. The kernel is
 * the user's own local process, so this matches JupyterLab's trusted-notebook
 * behaviour rather than attempting a full sanitizer.
 */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

function HtmlOutput({ html }: { html: string }) {
  return (
    <div
      className="jp-output-html secondary-scrollbar"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: kernel-produced rich output
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}

/* ------------------------------------------------------------------ LaTeX */

function LatexOutput({ latex }: { latex: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void import('katex').then((katex) => {
      if (cancelled || !host.current) return;
      const cleaned = latex.replace(/^\$\$?|\$\$?$/g, '').trim();
      try {
        katex.default.render(cleaned, host.current, { displayMode: true, throwOnError: false });
      } catch {
        host.current.textContent = latex;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [latex]);

  return <div ref={host} className="overflow-x-auto py-1" />;
}

/* ------------------------------------------------------------------ JSON */

function JsonOutput({ value }: { value: unknown }) {
  return (
    <pre className="text-primary-8 font-mono text-xs leading-relaxed whitespace-pre-wrap">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

/* ---------------------------------------------------------------- bundles */

function toText(value: unknown): string {
  if (Array.isArray(value)) return value.join('');
  return typeof value === 'string' ? value : String(value ?? '');
}

const MIME_PRIORITY = [
  'text/html',
  'image/svg+xml',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/latex',
  'text/markdown',
  'application/json',
  'text/plain',
];

function MimeBundle({ data, metadata }: { data: Record<string, any>; metadata?: any }) {
  const widgetKey = Object.keys(data).find((k) => k.startsWith('application/vnd.jupyter.widget'));
  const mime = MIME_PRIORITY.find((candidate) => data[candidate] != null);

  if (!mime) {
    if (widgetKey) {
      return (
        <div className="border-neutral-2 text-neutral-4 rounded-md border border-dashed px-3 py-2 text-xs">
          Interactive widget — ipywidgets rendering is not supported in obi-lab.
        </div>
      );
    }
    return (
      <div className="text-neutral-3 text-xs italic">
        No renderable representation ({Object.keys(data).join(', ') || 'empty'})
      </div>
    );
  }

  const value = data[mime];

  if (mime === 'text/html') return <HtmlOutput html={toText(value)} />;

  if (mime === 'image/svg+xml') {
    return (
      <div
        className="max-w-full overflow-x-auto"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: kernel-produced SVG figure
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(toText(value)) }}
      />
    );
  }

  if (mime.startsWith('image/')) {
    const meta = metadata?.[mime];
    return (
      // biome-ignore lint/performance/noImgElement: base64 payloads from the kernel
      <img
        src={`data:${mime};base64,${toText(value).replace(/\s/g, '')}`}
        alt="Cell output"
        width={meta?.width}
        height={meta?.height}
        className="max-w-full rounded-md"
        style={meta?.width ? { width: meta.width } : undefined}
      />
    );
  }

  if (mime === 'text/latex') return <LatexOutput latex={toText(value)} />;

  if (mime === 'application/json') return <JsonOutput value={value} />;

  if (mime === 'text/markdown') {
    return (
      <pre className="text-primary-9 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {toText(value)}
      </pre>
    );
  }

  return (
    <pre className="text-primary-9 font-mono text-xs leading-relaxed whitespace-pre-wrap">
      <AnsiText text={toText(value)} />
    </pre>
  );
}

/* ------------------------------------------------------------------ output */

export function OutputView({ output }: { output: nbformat.IOutput }) {
  switch (output.output_type) {
    case 'stream': {
      const isError = (output as any).name === 'stderr';
      return (
        <pre
          className={cn(
            'font-mono text-xs leading-relaxed whitespace-pre-wrap',
            isError
              ? 'text-destructive bg-destructive/5 border-destructive/25 -mx-1 rounded-sm border-l-2 px-2 py-1'
              : 'text-neutral-7'
          )}
        >
          <AnsiText text={toText((output as any).text)} />
        </pre>
      );
    }

    case 'error': {
      const error = output as any;
      const traceback: string[] = error.traceback ?? [];
      return (
        <div className="border-destructive/30 bg-destructive/4 overflow-hidden rounded-md border">
          <div className="border-destructive/20 bg-destructive/8 flex items-baseline gap-2 border-b px-3 py-1.5">
            <span className="text-destructive font-mono text-xs font-semibold">{error.ename}</span>
            <span className="text-neutral-4 truncate font-mono text-xs">{error.evalue}</span>
          </div>
          <pre className="secondary-scrollbar text-neutral-7 overflow-x-auto px-3 py-2 font-mono text-xs leading-relaxed">
            <AnsiText text={traceback.join('\n')} />
          </pre>
        </div>
      );
    }

    case 'execute_result':
    case 'display_data': {
      const rich = output as any;
      return <MimeBundle data={rich.data ?? {}} metadata={rich.metadata} />;
    }

    default:
      return null;
  }
}

export function OutputArea({ outputs }: { outputs: nbformat.IOutput[] }) {
  if (outputs.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {outputs.map((output, index) => (
        <OutputView key={index} output={output} />
      ))}
    </div>
  );
}
