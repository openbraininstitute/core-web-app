'use client';

import { RiCheckLine, RiFileCopyLine } from '@remixicon/react';
import { useEffect, useState } from 'react';

/** A value to paste somewhere else, shown as code with a button that copies it. */
export function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <span className="bg-neutral-1 inline-flex max-w-full items-center gap-2 rounded-md border border-neutral-200 py-1 pl-2.5 pr-1 align-middle">
      <code className="text-primary-9 break-all font-mono text-[13px]">{value}</code>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(value).then(() => setCopied(true))}
        className="text-primary-8 shrink-0 rounded p-1 transition-colors hover:bg-neutral-200"
        aria-label={copied ? 'Copied' : `Copy ${value}`}
        title={copied ? 'Copied' : 'Copy'}
      >
        {copied ? <RiCheckLine className="size-4" /> : <RiFileCopyLine className="size-4" />}
      </button>
    </span>
  );
}
