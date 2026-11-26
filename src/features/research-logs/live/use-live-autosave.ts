'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { saveResearchLogDocument } from '@/api/entitycore/queries/research-log';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import { textHash } from './hash';

import type { LiveLog } from './use-live-log';

/** A pause in typing this long saves the text to EntityCore… */
const IDLE_MS = 6_000;
/** …and no change waits longer than this, however long the typing goes on. */
const MAX_MS = 30_000;

export type LiveSave = {
  dirty: boolean;
  saving: boolean;
  savedAt?: number;
  savedBy?: string;
  error?: string;
  /** This tab is the one that saves for everyone. */
  leader: boolean;
  saveNow: () => Promise<void>;
};

/**
 * Writes the shared text back to EntityCore as a new document. Of the tabs that may write, the
 * one with the lowest client id does it, so each change is saved once rather than once per tab;
 * when it leaves, the next one takes over, saving anything left unsaved.
 */
export function useLiveAutosave(live: LiveLog | null, logId: string): LiveSave {
  const ctx = useWorkspace();
  const qc = useQueryClient();
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<{ at?: number; by?: string }>({});
  const inFlight = useRef<Promise<void> | null>(null);
  const latest = useRef({ live, ctx });
  latest.current = { live, ctx };

  const text = live?.text;
  const meta = live?.meta;
  const ready = !!live?.ready;
  const writers = live?.peers.filter((p) => p.canWrite) ?? [];
  const leader = ready && !live?.readOnly && writers[0]?.self === true;

  const saveNow = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    const run = (async () => {
      const { live: l, ctx: c } = latest.current;
      if (!l?.ready || l.readOnly) return;
      const markdown = l.text.toString();
      if (textHash(markdown) === l.meta.get('savedHash')) return;
      setSaving(true);
      setError(undefined);
      try {
        const asset = await saveResearchLogDocument({
          logId,
          markdown,
          previousAssetId: (l.meta.get('assetId') as string | null) ?? undefined,
          context: c,
        });
        l.doc.transact(() => {
          l.meta.set('assetId', asset.id);
          l.meta.set('savedHash', textHash(markdown));
          l.meta.set('savedAt', Date.now());
          l.meta.set('savedBy', l.self?.name ?? 'Someone');
          l.meta.delete('externalAssetId');
        });
        await qc.invalidateQueries({ queryKey: ['research-logs'] });
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setSaving(false);
      }
    })();
    inFlight.current = run;
    try {
      await run;
    } finally {
      inFlight.current = null;
    }
  }, [logId, qc]);

  // whether the shared text differs from what was last saved, and who saved it when
  useEffect(() => {
    if (!text || !meta || !ready) return;
    const read = () => {
      setDirty(textHash(text.toString()) !== meta.get('savedHash'));
      setSaved({
        at: meta.get('savedAt') as number | undefined,
        by: meta.get('savedBy') as string,
      });
    };
    read();
    text.observe(read);
    meta.observe(read);
    return () => {
      text.unobserve(read);
      meta.unobserve(read);
    };
  }, [text, meta, ready]);

  // the leader saves after a pause, or after MAX_MS of unbroken typing
  useEffect(() => {
    if (!leader || !text || !meta) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let firstChange: number | null = null;
    const schedule = () => {
      clearTimeout(timer);
      if (textHash(text.toString()) === meta.get('savedHash')) {
        firstChange = null;
        return;
      }
      firstChange ??= Date.now();
      const wait = Math.max(0, Math.min(IDLE_MS, firstChange + MAX_MS - Date.now()));
      timer = setTimeout(() => {
        firstChange = null;
        saveNow().catch(() => undefined);
      }, wait);
    };
    schedule();
    text.observe(schedule);
    meta.observe(schedule);
    return () => {
      clearTimeout(timer);
      text.unobserve(schedule);
      meta.unobserve(schedule);
    };
  }, [leader, text, meta, saveNow]);

  return { dirty, saving, savedAt: saved.at, savedBy: saved.by, error, leader, saveNow };
}
