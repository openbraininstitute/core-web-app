'use client';

import { useState } from 'react';

import { cn } from '@/utils/css-class';

import { CodeBlock } from './code-block';

import type { SdkSnippets as SdkSnippetsData } from '../types';

export function SdkSnippets({ setup, operations }: SdkSnippetsData) {
  const [active, setActive] = useState(0);
  const current = operations[active] ?? operations[0];

  return (
    <div>
      <details className="group mb-3">
        <summary className="cursor-pointer list-none text-sm text-primary-7 hover:underline">
          Client setup
          <span className="text-label group-open:hidden"> — show how to connect</span>
        </summary>
        <p className="mt-2 mb-2 text-sm text-neutral-4">
          Install with{' '}
          <code className="bg-neutral-1 rounded px-1 py-0.5 font-mono text-neutral-6">
            pip install entitysdk obi-auth
          </code>
          , then create a client scoped to your virtual lab and project.
        </p>
        <CodeBlock code={setup} />
      </details>

      <div className="flex flex-wrap gap-1.5">
        {operations.map((op, i) => {
          const selected = i === active;
          return (
            <button
              key={op.label}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition',
                selected
                  ? 'bg-primary-9 text-white'
                  : 'border-neutral-2 hover:text-primary-9 border bg-white text-neutral-5'
              )}
            >
              {op.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <CodeBlock code={current.code} />
      </div>
    </div>
  );
}
