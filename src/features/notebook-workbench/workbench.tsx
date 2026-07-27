'use client';

import { RiCloseLine, RiExternalLinkLine, RiFolder3Line, RiSparkling2Line } from '@remixicon/react';
import { useSetAtom } from 'jotai';
import { motion } from 'motion/react';
import { useCallback, useState } from 'react';

import { promptAtom } from '@/features/ai-assistant/state';
import { Button } from '@/ui/molecules/button';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { cn } from '@/utils/css-class';

import { FileBrowser } from './components/file-browser';
import { FileEditor } from './components/file-editor';
import { FileIcon } from './components/file-icon';
import { NotebookEditor } from './components/notebook-editor';
import { useContents } from './jupyter/use-contents';
import { basename, fileKind } from './paths';
import { Tooltip } from './ui/tooltip';

import type { Contents } from '@jupyterlab/services';

import './workbench.css';

interface OpenDoc {
  path: string;
  name: string;
  notebook: boolean;
}

interface WorkbenchProps {
  /** Notebook to open first, relative to the pod's root. */
  initialPath: string;
  /** Shown in the header and used for the assistant prompt. */
  title: string;
  /** JupyterHub URL, for the "Open in JupyterHub" escape hatch. */
  podUrl: string;
}

export function NotebookWorkbench({ initialPath, title, podUrl }: WorkbenchProps) {
  const contents = useContents();
  const [docs, setDocs] = useState<OpenDoc[]>(() => [
    {
      path: initialPath,
      name: basename(initialPath),
      notebook: fileKind(initialPath) === 'notebook',
    },
  ]);
  const [activePath, setActivePath] = useState<string>(initialPath);
  const [filesOpen, setFilesOpen] = useState(false);

  const setPrompt = useSetAtom(promptAtom);
  const { setState: setPanelState } = usePanelState();

  const openEntry = useCallback((entry: Contents.IModel) => {
    if (entry.type === 'directory') return;
    setDocs((current) =>
      current.some((doc) => doc.path === entry.path)
        ? current
        : [...current, { path: entry.path, name: entry.name, notebook: entry.type === 'notebook' }]
    );
    setActivePath(entry.path);
  }, []);

  const closeDoc = useCallback((path: string) => {
    setDocs((current) => {
      const next = current.filter((doc) => doc.path !== path);
      if (next.length === 0) return current; // keep at least one document open
      setActivePath((active) => {
        if (active !== path) return active;
        const index = current.findIndex((doc) => doc.path === path);
        return next[Math.min(index, next.length - 1)].path;
      });
      return next;
    });
  }, []);

  /** Hands the notebook to the assistant sitting in the rail next door. */
  const askAssistant = useCallback(() => {
    setPrompt(`About the notebook "${title}" I have open: `);
    setPanelState(PanelState.Expanded);
    requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>('textarea[data-testid="ai-chat-input"]')?.focus();
    });
  }, [setPanelState, setPrompt, title]);

  return (
    <div
      className="nbw-root ml-3 flex h-full max-h-[calc(100vh-6rem)] flex-col gap-2 overflow-hidden pr-1"
      data-testid="notebook-workbench"
    >
      <header className="flex shrink-0 items-center gap-2">
        <Tooltip label={filesOpen ? 'Hide files' : 'Show files'} side="bottom">
          <button
            type="button"
            onClick={() => setFilesOpen((v) => !v)}
            aria-label="Toggle file browser"
            className={cn(
              'flex size-8 items-center justify-center rounded-md transition-colors',
              filesOpen
                ? 'bg-primary-9 text-white'
                : 'text-neutral-4 hover:bg-neutral-1 hover:text-primary-9'
            )}
          >
            <RiFolder3Line className="size-4" />
          </button>
        </Tooltip>

        <h1 className="text-primary-9 min-w-0 truncate text-sm font-bold" title={title}>
          {title}
        </h1>

        <div className="flex-1" />

        <Button variant="outline" size="sm" onClick={askAssistant} data-testid="nbw-ask-ai">
          <RiSparkling2Line className="size-3.5" />
          Ask the assistant
        </Button>
        <a href={podUrl} target="_blank" rel="noreferrer">
          <Button variant="ghost" size="sm">
            <RiExternalLinkLine className="size-3.5" />
            Open in JupyterHub
          </Button>
        </a>
      </header>

      <motion.div
        className="grid min-h-0 flex-1 gap-2 overflow-hidden"
        initial={false}
        animate={{ gridTemplateColumns: filesOpen ? '18rem 1fr' : '0rem 1fr' }}
        transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.6 }}
      >
        <aside
          className={cn(
            'border-neutral-2 flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-white',
            !filesOpen && 'pointer-events-none opacity-0'
          )}
        >
          <FileBrowser
            contents={contents}
            activePath={activePath}
            openPaths={docs.map((d) => d.path)}
            runningPaths={[]}
            onOpen={openEntry}
            onPathRenamed={(from, to) => {
              setDocs((current) =>
                current.map((doc) =>
                  doc.path === from ? { ...doc, path: to, name: basename(to) } : doc
                )
              );
              setActivePath((active) => (active === from ? to : active));
            }}
            onPathRemoved={(path) => closeDoc(path)}
          />
        </aside>

        <main className="border-neutral-2 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border bg-white">
          {docs.length > 1 ? (
            <div className="border-neutral-2 no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto border-b px-2 py-1.5">
              {docs.map((doc) => {
                const active = doc.path === activePath;
                return (
                  <div
                    key={doc.path}
                    className={cn(
                      'flex h-7 shrink-0 items-center gap-1.5 rounded-full pr-1 pl-2.5 text-xs transition-colors',
                      active
                        ? 'bg-primary-9 font-semibold text-white'
                        : 'text-neutral-4 hover:bg-neutral-1 hover:text-primary-9'
                    )}
                  >
                    <FileIcon
                      name={doc.name}
                      className={cn('size-3.5 shrink-0', active && 'text-white')}
                    />
                    <button
                      type="button"
                      onClick={() => setActivePath(doc.path)}
                      className="max-w-44 truncate"
                      title={doc.path}
                    >
                      {doc.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => closeDoc(doc.path)}
                      aria-label={`Close ${doc.name}`}
                      className={cn(
                        'shrink-0 rounded-full p-0.5 transition-colors',
                        active ? 'hover:bg-white/20' : 'hover:bg-neutral-2'
                      )}
                    >
                      <RiCloseLine className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="relative min-h-0 flex-1">
            {docs.map((doc) => (
              <div
                key={doc.path}
                className={cn('absolute inset-0', doc.path === activePath ? 'block' : 'hidden')}
              >
                {doc.notebook ? <NotebookEditor path={doc.path} /> : <FileEditor path={doc.path} />}
              </div>
            ))}
          </div>
        </main>
      </motion.div>
    </div>
  );
}
