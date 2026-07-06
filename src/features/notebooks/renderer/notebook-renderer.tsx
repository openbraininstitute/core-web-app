'use client';

import { LoadingOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';

import { cn } from '@/utils/css-class';

import type { Ipynb } from '@jupyter-kit/core';

// `@jupyter-kit/react` (CodeMirror under the hood) is browser-only, so load it lazily without SSR.
const JupyterNotebook = dynamic(() => import('./jupyter-notebook'), {
  ssr: false,
  loading: () => (
    <div className="flex h-32 items-center justify-center text-neutral-400">
      <LoadingOutlined className="text-xl" />
    </div>
  ),
});

export function NotebookRenderer({ ipynb, className }: { ipynb: Ipynb; className?: string }) {
  return (
    <div data-testid="notebook-renderer" className={cn('jupyter-kit', className)}>
      <JupyterNotebook ipynb={ipynb} />
    </div>
  );
}
