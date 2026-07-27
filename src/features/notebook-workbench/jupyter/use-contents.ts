'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { dirname, joinPath } from '@/features/notebook-workbench/paths';

import { useServices } from './context';

import type { Contents } from '@jupyterlab/services';

export type DirectoryMap = Record<string, Contents.IModel[]>;

export interface ContentsController {
  /** Children keyed by directory path; '' is the server root. */
  directories: DirectoryMap;
  expanded: Set<string>;
  loading: Set<string>;
  error: string | null;
  ready: boolean;

  toggle: (path: string) => void;
  expand: (path: string) => Promise<void>;
  refresh: (path?: string) => Promise<void>;

  createNotebook: (dir: string) => Promise<string | null>;
  createFile: (dir: string) => Promise<string | null>;
  createFolder: (dir: string) => Promise<string | null>;
  rename: (path: string, newName: string) => Promise<string | null>;
  remove: (path: string) => Promise<void>;
  duplicate: (path: string) => Promise<void>;
  upload: (dir: string, files: FileList | File[]) => Promise<void>;
}

export function useContents(): ContentsController {
  const services = useServices();
  const [directories, setDirectories] = useState<DirectoryMap>({});
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['']));
  const [loading, setLoading] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const inFlight = useRef<Set<string>>(new Set());

  const fetchDir = useCallback(
    async (path: string) => {
      if (inFlight.current.has(path)) return;
      inFlight.current.add(path);
      setLoading((current) => new Set(current).add(path));
      try {
        const svc = services;
        await svc.ready;
        const listing = await svc.contents.get(path, { content: true });
        const children = ((listing.content as Contents.IModel[]) ?? [])
          .slice()
          .sort(compareEntries);
        setDirectories((current) => ({ ...current, [path]: children }));
        setError(null);
        setReady(true);
      } catch (e: any) {
        setError(e?.message ?? String(e));
        if (path === '') setReady(false);
      } finally {
        inFlight.current.delete(path);
        setLoading((current) => {
          const next = new Set(current);
          next.delete(path);
          return next;
        });
      }
    },
    [services]
  );

  useEffect(() => {
    void fetchDir('');
  }, [fetchDir]);

  const expand = useCallback(
    async (path: string) => {
      setExpanded((current) => new Set(current).add(path));
      await fetchDir(path);
    },
    [fetchDir]
  );

  const toggle = useCallback(
    (path: string) => {
      setExpanded((current) => {
        const next = new Set(current);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
          void fetchDir(path);
        }
        return next;
      });
    },
    [fetchDir]
  );

  const refresh = useCallback(
    async (path?: string) => {
      if (path != null) {
        await fetchDir(path);
        return;
      }
      await Promise.all([...expanded].map((dir) => fetchDir(dir)));
    },
    [expanded, fetchDir]
  );

  const create = useCallback(
    async (dir: string, options: Contents.ICreateOptions): Promise<string | null> => {
      try {
        const svc = services;
        const created = await svc.contents.newUntitled({ path: dir, ...options });
        await fetchDir(dir);
        setExpanded((current) => new Set(current).add(dir));
        return created.path;
      } catch (e: any) {
        setError(e?.message ?? String(e));
        return null;
      }
    },
    [fetchDir, services]
  );

  const createNotebook = useCallback((dir: string) => create(dir, { type: 'notebook' }), [create]);
  const createFile = useCallback(
    (dir: string) => create(dir, { type: 'file', ext: '.txt' }),
    [create]
  );
  const createFolder = useCallback((dir: string) => create(dir, { type: 'directory' }), [create]);

  const rename = useCallback(
    async (path: string, newName: string) => {
      const parent = dirname(path);
      const target = joinPath(parent, newName);
      if (target === path) return path;
      try {
        const svc = services;
        const model = await svc.contents.rename(path, target);
        await fetchDir(parent);
        return model.path;
      } catch (e: any) {
        setError(e?.message ?? String(e));
        return null;
      }
    },
    [fetchDir, services]
  );

  const remove = useCallback(
    async (path: string) => {
      try {
        await services.contents.delete(path);
        await fetchDir(dirname(path));
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    },
    [fetchDir, services]
  );

  const duplicate = useCallback(
    async (path: string) => {
      const parent = dirname(path);
      try {
        await services.contents.copy(path, parent || '/');
        await fetchDir(parent);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    },
    [fetchDir, services]
  );

  const upload = useCallback(
    async (dir: string, files: FileList | File[]) => {
      const svc = services;
      for (const file of Array.from(files)) {
        try {
          const isText =
            file.type.startsWith('text/') || /\.(txt|md|py|json|csv|ya?ml)$/i.test(file.name);
          const target = joinPath(dir, file.name);
          if (isText) {
            await svc.contents.save(target, {
              type: 'file',
              format: 'text',
              content: await file.text(),
            });
          } else {
            const buffer = await file.arrayBuffer();
            await svc.contents.save(target, {
              type: 'file',
              format: 'base64',
              content: toBase64(buffer),
            });
          }
        } catch (e: any) {
          setError(`${file.name}: ${e?.message ?? String(e)}`);
        }
      }
      await fetchDir(dir);
    },
    [fetchDir, services]
  );

  return {
    directories,
    expanded,
    loading,
    error,
    ready,
    toggle,
    expand,
    refresh,
    createNotebook,
    createFile,
    createFolder,
    rename,
    remove,
    duplicate,
    upload,
  };
}

function compareEntries(a: Contents.IModel, b: Contents.IModel): number {
  if (a.type === 'directory' && b.type !== 'directory') return -1;
  if (a.type !== 'directory' && b.type === 'directory') return 1;
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
