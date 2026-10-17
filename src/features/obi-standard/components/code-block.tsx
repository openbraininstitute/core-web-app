'use client';

import { useState } from 'react';

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="absolute top-2 right-2 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/10"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/** Dark, copyable code block with dimmed full-line comments. */
export function CodeBlock({ code }: { code: string }) {
  const lines = code.split('\n');

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#0c111d]">
      <CopyButton code={code} />
      <pre className="overflow-x-auto p-4 pr-16 text-[0.82rem] leading-relaxed">
        <code className="font-mono">
          {lines.map((line, i) => {
            const isComment = line.trimStart().startsWith('#');
            return (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: code lines are a stable, static sequence
                key={i}
                className={isComment ? 'text-slate-500' : 'text-slate-200'}
              >
                {line}
                {i < lines.length - 1 ? '\n' : ''}
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
