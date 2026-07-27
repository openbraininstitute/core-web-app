'use client';

import {
  RiAddLine,
  RiArrowRightSFill,
  RiDeleteBin6Line,
  RiDownload2Line,
  RiEdit2Line,
  RiFileCopyLine,
  RiFolderAddLine,
  RiRefreshLine,
  RiSearchLine,
  RiUpload2Line,
} from '@remixicon/react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { fileUrl } from '@/features/notebook-workbench/jupyter/connection';
import { useJupyter } from '@/features/notebook-workbench/jupyter/context';
import { basename, dirname } from '@/features/notebook-workbench/paths';
import { Menu } from '@/features/notebook-workbench/ui/menu';
import { Modal } from '@/features/notebook-workbench/ui/modal';
import { Tooltip } from '@/features/notebook-workbench/ui/tooltip';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import { FileIcon } from './file-icon';

import type { Contents } from '@jupyterlab/services';
import type { ContentsController } from '@/features/notebook-workbench/jupyter/use-contents';

interface FileBrowserProps {
  contents: ContentsController;
  activePath: string | null;
  openPaths: string[];
  runningPaths: string[];
  onOpen: (entry: Contents.IModel) => void;
  onPathRenamed: (from: string, to: string) => void;
  onPathRemoved: (path: string) => void;
}

interface ContextTarget {
  entry: Contents.IModel;
  x: number;
  y: number;
}

export function FileBrowser({
  contents,
  activePath,
  openPaths,
  runningPaths,
  onOpen,
  onPathRenamed,
  onPathRemoved,
}: FileBrowserProps) {
  const [filter, setFilter] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [contextTarget, setContextTarget] = useState<ContextTarget | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Contents.IModel | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);

  // New items land beside whatever is open, falling back to the workspace root.
  const targetDir = activePath ? dirname(activePath) : '';

  const handleCreate = async (kind: 'notebook' | 'file' | 'folder') => {
    const created =
      kind === 'notebook'
        ? await contents.createNotebook(targetDir)
        : kind === 'file'
          ? await contents.createFile(targetDir)
          : await contents.createFolder(targetDir);
    if (created) setRenaming(created);
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden transition-colors',
        dragOver && 'bg-primary-0/50'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) void contents.upload(targetDir, e.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <h2 className="text-neutral-4 text-[11px] font-semibold tracking-wider uppercase">Files</h2>
        <div className="flex items-center gap-0.5">
          <Menu
            width="w-52"
            items={[
              {
                key: 'notebook',
                label: 'Notebook',
                icon: <FileIcon name="x.ipynb" />,
                onSelect: () => void handleCreate('notebook'),
              },
              {
                key: 'file',
                label: 'Text file',
                icon: <FileIcon name="x.txt" />,
                onSelect: () => void handleCreate('file'),
              },
              {
                key: 'folder',
                label: 'Folder',
                icon: <RiFolderAddLine className="size-3.5" />,
                onSelect: () => void handleCreate('folder'),
              },
              {
                key: 'upload',
                label: 'Upload files',
                separatorBefore: true,
                icon: <RiUpload2Line className="size-3.5" />,
                onSelect: () => uploadInput.current?.click(),
              },
            ]}
            trigger={({ toggle }) => (
              <Tooltip label="New" side="left">
                <button
                  type="button"
                  onClick={toggle}
                  aria-label="Create new"
                  className="text-neutral-4 hover:text-primary-9 hover:bg-neutral-1 rounded-md p-1.5 transition-colors"
                >
                  <RiAddLine className="size-4" />
                </button>
              </Tooltip>
            )}
          />
          <Tooltip label="Refresh" side="left">
            <button
              type="button"
              onClick={() => void contents.refresh()}
              aria-label="Refresh file list"
              className="text-neutral-4 hover:text-primary-9 hover:bg-neutral-1 rounded-md p-1.5 transition-colors"
            >
              <RiRefreshLine className="size-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="px-3 pb-2">
        <div className="border-neutral-2 focus-within:border-primary-5 flex h-8 items-center gap-2 rounded-full border bg-white px-3 transition-colors">
          <RiSearchLine className="text-neutral-3 size-3.5 shrink-0" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files"
            className="text-primary-9 placeholder:text-neutral-3 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:font-light"
          />
        </div>
      </div>

      <input
        ref={uploadInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void contents.upload(targetDir, e.target.files);
          e.target.value = '';
        }}
      />

      <div className="secondary-scrollbar flex-1 overflow-y-auto px-2 pb-3">
        {contents.error && !contents.ready ? (
          <ConnectionError message={contents.error} onRetry={() => void contents.refresh('')} />
        ) : (
          <FileTreeLevel
            dir=""
            depth={0}
            contents={contents}
            filter={filter.trim().toLowerCase()}
            activePath={activePath}
            openPaths={openPaths}
            runningPaths={runningPaths}
            renaming={renaming}
            onOpen={onOpen}
            onContextMenu={(entry, x, y) => setContextTarget({ entry, x, y })}
            onRenameCommit={async (entry, name) => {
              setRenaming(null);
              if (!name || name === entry.name) return;
              const next = await contents.rename(entry.path, name);
              if (next) onPathRenamed(entry.path, next);
            }}
            onRenameCancel={() => setRenaming(null)}
          />
        )}
      </div>

      {contextTarget
        ? createPortal(
            <ContextMenu
              target={contextTarget}
              onClose={() => setContextTarget(null)}
              onRename={() => setRenaming(contextTarget.entry.path)}
              onDuplicate={() => void contents.duplicate(contextTarget.entry.path)}
              onDelete={() => setConfirmDelete(contextTarget.entry)}
            />,
            document.body
          )
        : null}

      <Modal
        open={confirmDelete !== null}
        title={`Delete ${confirmDelete?.type === 'directory' ? 'folder' : 'file'}`}
        description={confirmDelete?.name}
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                const entry = confirmDelete;
                setConfirmDelete(null);
                if (!entry) return;
                await contents.remove(entry.path);
                onPathRemoved(entry.path);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-neutral-4 text-sm">
          {confirmDelete?.type === 'directory'
            ? 'This folder and everything inside it will be permanently removed from the workspace.'
            : 'This file will be permanently removed from the workspace.'}{' '}
          This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------- level */

interface LevelProps {
  dir: string;
  depth: number;
  contents: ContentsController;
  filter: string;
  activePath: string | null;
  openPaths: string[];
  runningPaths: string[];
  renaming: string | null;
  onOpen: (entry: Contents.IModel) => void;
  onContextMenu: (entry: Contents.IModel, x: number, y: number) => void;
  onRenameCommit: (entry: Contents.IModel, name: string) => void;
  onRenameCancel: () => void;
}

function FileTreeLevel(props: LevelProps) {
  const { dir, depth, contents, filter } = props;
  const entries = contents.directories[dir];
  const isLoading = contents.loading.has(dir);

  if (!entries) {
    return isLoading ? (
      <div className="text-neutral-3 px-3 py-2 text-xs" style={{ paddingLeft: 12 + depth * 14 }}>
        Loading…
      </div>
    ) : null;
  }

  const visible = filter
    ? entries.filter(
        (entry) => entry.type === 'directory' || entry.name.toLowerCase().includes(filter)
      )
    : entries;

  if (visible.length === 0) {
    return (
      <div
        className="text-neutral-3 py-1.5 text-xs italic"
        style={{ paddingLeft: 12 + depth * 14 }}
      >
        {filter ? 'No matches' : 'Empty'}
      </div>
    );
  }

  return (
    <>
      {visible.map((entry) => (
        <FileTreeNode key={entry.path} entry={entry} {...props} />
      ))}
    </>
  );
}

function FileTreeNode({ entry, ...props }: LevelProps & { entry: Contents.IModel }) {
  const {
    depth,
    contents,
    activePath,
    openPaths,
    runningPaths,
    renaming,
    onOpen,
    onContextMenu,
    onRenameCommit,
    onRenameCancel,
  } = props;

  const isDirectory = entry.type === 'directory';
  const isExpanded = contents.expanded.has(entry.path);
  const isActive = activePath === entry.path;
  const isOpen = openPaths.includes(entry.path);
  const isRunning = runningPaths.includes(entry.path);
  const isRenaming = renaming === entry.path;

  return (
    <div>
      <div
        className={cn(
          'group relative flex items-center gap-1.5 rounded-md py-1 pr-1.5 transition-colors',
          isActive
            ? 'bg-primary-highlight text-primary-8 font-semibold'
            : 'text-primary-9 hover:bg-primary-highlight/35'
        )}
        style={{ paddingLeft: 6 + depth * 14 }}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(entry, e.clientX, e.clientY);
        }}
      >
        {isDirectory ? (
          <button
            type="button"
            onClick={() => contents.toggle(entry.path)}
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
            className="text-neutral-3 hover:text-primary-9 -m-0.5 shrink-0 p-0.5"
          >
            <RiArrowRightSFill
              className={cn(
                'size-3.5 transition-transform duration-200',
                isExpanded && 'rotate-90'
              )}
            />
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}

        <FileIcon name={entry.name} isDirectory={isDirectory} className="shrink-0" />

        {isRenaming ? (
          <RenameField
            initial={entry.name}
            onCommit={(name) => onRenameCommit(entry, name)}
            onCancel={onRenameCancel}
          />
        ) : (
          <button
            type="button"
            onClick={() => (isDirectory ? contents.toggle(entry.path) : onOpen(entry))}
            onDoubleClick={() => !isDirectory && onOpen(entry)}
            className="min-w-0 flex-1 truncate text-left text-xs"
            title={entry.name}
          >
            {entry.name}
          </button>
        )}

        {isRunning ? (
          <Tooltip label="Kernel running" side="left">
            <span className="bg-accent-dark size-1.5 shrink-0 rounded-full" />
          </Tooltip>
        ) : isOpen && !isActive ? (
          <span className="bg-neutral-3 size-1.5 shrink-0 rounded-full" />
        ) : null}
      </div>

      {isDirectory && isExpanded ? (
        <div
          className="border-primary-2/50 ml-[13px] border-l border-dotted"
          style={{ marginLeft: 13 + depth * 14 }}
        >
          <div style={{ marginLeft: -(13 + depth * 14) }}>
            <FileTreeLevel {...props} dir={entry.path} depth={depth + 1} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RenameField({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    input.focus();
    const dot = initial.lastIndexOf('.');
    input.setSelectionRange(0, dot > 0 ? dot : initial.length);
  }, [initial]);

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onCommit(value.trim())}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (e.key === 'Enter') onCommit(value.trim());
        if (e.key === 'Escape') onCancel();
      }}
      className="border-primary-5 text-primary-9 min-w-0 flex-1 rounded-sm border bg-white px-1 py-px text-xs outline-none"
    />
  );
}

/* ------------------------------------------------------------ context menu */

function ContextMenu({
  target,
  onClose,
  onRename,
  onDuplicate,
  onDelete,
}: {
  target: ContextTarget;
  onClose: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { target: pod } = useJupyter();

  useEffect(() => {
    const dismiss = () => onClose();
    const onKeyDown = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose();
    // Defer so the opening right-click doesn't immediately close it.
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', dismiss);
      document.addEventListener('scroll', dismiss, true);
    }, 0);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('scroll', dismiss, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const isDirectory = target.entry.type === 'directory';
  const item =
    'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs text-primary-9 hover:bg-primary-0 transition-colors';

  const left = Math.min(target.x, window.innerWidth - 190);
  const top = Math.min(target.y, window.innerHeight - 180);

  return (
    <div
      ref={ref}
      className="border-neutral-2 fixed z-200 w-44 overflow-hidden rounded-lg border bg-white py-1 shadow-lift"
      style={{ left, top }}
    >
      <button
        type="button"
        className={item}
        onClick={() => {
          onClose();
          onRename();
        }}
      >
        <RiEdit2Line className="size-3.5 opacity-70" />
        Rename
      </button>
      <button
        type="button"
        className={item}
        onClick={() => {
          onClose();
          onDuplicate();
        }}
      >
        <RiFileCopyLine className="size-3.5 opacity-70" />
        Duplicate
      </button>
      {!isDirectory ? (
        <a
          href={fileUrl(pod, target.entry.path, true)}
          download={target.entry.name}
          className={item}
          onClick={onClose}
        >
          <RiDownload2Line className="size-3.5 opacity-70" />
          Download
        </a>
      ) : null}
      <div className="bg-neutral-2 my-1 h-px" />
      <button
        type="button"
        className={cn(item, 'text-destructive hover:bg-destructive hover:text-white')}
        onClick={() => {
          onClose();
          onDelete();
        }}
      >
        <RiDeleteBin6Line className="size-3.5 opacity-70" />
        Delete
      </button>
    </div>
  );
}

function ConnectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="border-destructive/30 bg-destructive/5 m-1 rounded-lg border p-3">
      <p className="text-destructive text-xs font-semibold">Cannot reach the notebook server</p>
      <p className="text-neutral-4 mt-1 text-xs leading-relaxed">{message}</p>
      <p className="text-neutral-4 mt-2 text-xs leading-relaxed">
        The pod may still be starting. If this persists, open it in JupyterHub from the header.
      </p>
      <Button size="sm" variant="outline" className="mt-2.5" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export { basename };
