'use client';

import { useState } from 'react';

import { cn } from '@/utils/css-class';

/*
 * Sharing a course: the device's own share sheet where there is one (phones, tablets, Safari,
 * Edge...), so it goes to messages, mail, AirDrop or wherever the person likes; elsewhere, the
 * link copied, and said so. What is shared is the course's own page, which anyone signed in can
 * open, rather than the Learn page of one project.
 */

export type Shared = { title: string; text?: string; path: string };

async function share({ title, text, path }: Shared): Promise<'shared' | 'copied' | 'none'> {
  const url = new URL(path, window.location.origin).toString();
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (error) {
      // closed without sharing: nothing to say
      if (error instanceof DOMException && error.name === 'AbortError') return 'none';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'none';
  }
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path
        d="M8 10.2V2.4m0 0L5.3 5.1M8 2.4l2.7 2.7M4.6 7.6H3.8c-.66 0-1.2.54-1.2 1.2v4c0 .66.54 1.2 1.2 1.2h8.4c.66 0 1.2-.54 1.2-1.2v-4c0-.66-.54-1.2-1.2-1.2h-.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useShare(what: Shared) {
  const [note, setNote] = useState<string | null>(null);
  const run = async () => {
    const done = await share(what);
    if (done === 'copied') {
      setNote('Link copied');
      window.setTimeout(() => setNote(null), 1600);
    }
  };
  return { note, run };
}

/** On the course card on the right: a round button beside the course's own. */
export function ShareButton({ what, className }: { what: Shared; className?: string }) {
  const { note, run } = useShare(what);
  return (
    <button
      type="button"
      onClick={run}
      aria-label={`Share ${what.title}`}
      title="Share"
      className={cn(
        'relative flex size-[42px] shrink-0 items-center justify-center rounded-full border border-[#d9d9d9] bg-white text-[#002766] transition-colors hover:border-[#002766] hover:bg-[#f0f5ff]',
        className
      )}
    >
      <ShareIcon className="size-[17px]" />
      {note && (
        <span
          role="status"
          className="absolute top-full right-0 mt-[6px] rounded-[6px] bg-[#002766] px-[8px] py-[3px] text-[11px] font-semibold whitespace-nowrap text-white"
        >
          {note}
        </span>
      )}
    </button>
  );
}

/**
 * On a course's small card on the left, which is itself a button: so not a button inside it,
 * but a span that acts as one, its clicks kept from choosing the course too.
 */
export function ShareChip({ what, className }: { what: Shared; className?: string }) {
  const { note, run } = useShare(what);
  const act = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    void run();
  };
  return (
    // biome-ignore lint/a11y/useSemanticElements: a <button> cannot sit inside the card's own button
    <span
      role="button"
      tabIndex={0}
      aria-label={`Share ${what.title}`}
      title="Share"
      onClick={act}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') act(e);
        else e.stopPropagation();
      }}
      className={cn(
        'flex size-[28px] items-center justify-center rounded-full bg-white/80 text-[#002766] shadow-[0_1px_4px_rgba(0,39,102,0.15)] transition-colors hover:bg-white hover:text-[#1890ff]',
        className
      )}
    >
      <ShareIcon className="size-[14px]" />
      {note && (
        <span
          role="status"
          className="absolute top-full right-0 z-10 mt-[4px] rounded-[6px] bg-[#002766] px-[8px] py-[3px] text-[11px] font-semibold whitespace-nowrap text-white"
        >
          {note}
        </span>
      )}
    </span>
  );
}
