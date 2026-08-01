'use client';

import { RiDownload2Line, RiErrorWarningLine, RiSave3Line } from '@remixicon/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppNotification } from '@/components/notification';
import { fileUrl } from '@/features/notebook-workbench/jupyter/connection';
import { useJupyter, useServices } from '@/features/notebook-workbench/jupyter/context';
import { extension, fileKind, formatBytes } from '@/features/notebook-workbench/paths';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import { CodeEditor } from './code-editor';

function editorLanguage(path: string): 'python' | 'markdown' | 'json' | 'text' {
  const ext = extension(path);
  if (ext === 'py') return 'python';
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'json' || ext === 'ipynb') return 'json';
  return 'text';
}

export function FileEditor({ path }: { path: string }) {
  const kind = fileKind(path);
  if (kind === 'image') return <ImageViewer path={path} />;
  if (kind === 'binary') return <BinaryPlaceholder path={path} />;
  return <TextFileEditor path={path} />;
}

function TextFileEditor({ path }: { path: string }) {
  const services = useServices();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef('');
  const notification = useAppNotification();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const svc = services;
        await svc.ready;
        const file = await svc.contents.get(path, { content: true, type: 'file', format: 'text' });
        if (cancelled) return;
        const text = typeof file.content === 'string' ? file.content : '';
        setContent(text);
        contentRef.current = text;
        setDirty(false);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, services]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await services.contents.save(path, {
        type: 'file',
        format: 'text',
        content: contentRef.current,
      });
      setDirty(false);
      notification.success({ message: 'File saved', key: 'nbw-file-saved', placement: 'topRight' });
    } catch (e: any) {
      setError(e?.message ?? String(e));
      notification.error({
        message: e?.message ?? 'Save failed',
        key: 'nbw-file-save-failed',
        placement: 'topRight',
      });
    } finally {
      setSaving(false);
    }
  }, [notification, path, services]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [save]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="border-neutral-2 border-t-primary-9 size-7 animate-spin rounded-full border-2" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-neutral-2 flex items-center gap-2 border-b bg-white px-3 py-2">
        <Button
          size="sm"
          variant={dirty ? 'default' : 'outline'}
          onClick={() => void save()}
          disabled={saving || !dirty}
        >
          <RiSave3Line className="size-3.5" />
          {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
        </Button>
        <div className="flex-1" />
        <span className="text-neutral-3 font-mono text-[11px] tracking-wide uppercase">
          {editorLanguage(path)}
        </span>
      </div>

      {error ? (
        <div className="border-destructive/30 bg-destructive/6 text-destructive flex items-center gap-2 border-b px-4 py-2 text-xs">
          <RiErrorWarningLine className="size-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="secondary-scrollbar flex-1 overflow-auto bg-white">
        <CodeEditor
          value={content}
          language={editorLanguage(path)}
          showLineNumbers
          fillHeight
          onChange={(value) => {
            contentRef.current = value;
            setDirty(true);
          }}
          onSave={() => void save()}
        />
      </div>
    </div>
  );
}

function ImageViewer({ path }: { path: string }) {
  const { target } = useJupyter();
  return (
    <div className="bg-neutral-1 secondary-scrollbar flex h-full items-center justify-center overflow-auto p-8">
      {/* biome-ignore lint/performance/noImgElement: served directly by Jupyter */}
      <img
        src={fileUrl(target, path)}
        alt={path}
        className="border-neutral-2 max-h-full max-w-full rounded-lg border bg-white shadow-lift"
      />
    </div>
  );
}

function BinaryPlaceholder({ path }: { path: string }) {
  const services = useServices();
  const { target } = useJupyter();
  const [size, setSize] = useState<number | null>(null);

  useEffect(() => {
    void services.contents
      .get(path, { content: false })
      .then((model) => setSize(model.size ?? null))
      .catch(() => undefined);
  }, [path, services]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="border-neutral-2 flex size-14 items-center justify-center rounded-2xl border bg-white">
        <RiDownload2Line className="text-neutral-3 size-6" />
      </div>
      <div>
        <p className="text-primary-9 text-sm font-semibold">No preview available</p>
        <p className={cn('text-neutral-4 mt-1 text-xs')}>
          {formatBytes(size)} · this file type can't be shown in the editor
        </p>
      </div>
      <a href={fileUrl(target, path, true)} download>
        <Button size="sm" variant="outline">
          <RiDownload2Line className="size-3.5" />
          Download
        </Button>
      </a>
    </div>
  );
}
