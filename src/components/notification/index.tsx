'use client';

import { type SileoOptions, type SileoPosition, sileo, Toaster } from 'sileo';

import type { ReactNode } from 'react';

export type NotifyType = 'success' | 'error' | 'warning' | 'info' | 'action';

export interface NotifyOptions {
  /** Short heading of the toast. Always provide one. */
  title: string;
  /** Supporting text (or rich content) shown under the title. */
  description?: ReactNode;
  /**
   * Auto-dismiss delay in seconds (antd-compatible).
   * `null` or `0` keeps the toast until manually dismissed.
   * Omitted: sileo default (6s).
   */
  duration?: number | null;
  /** Stable identity: a new toast with the same key replaces the previous one. */
  key?: string;
  /** Override the default top-center placement for this toast. */
  position?: SileoPosition;
  /** Custom badge icon. */
  icon?: ReactNode | null;
  /** Optional action button rendered inside the toast. */
  button?: { title: string; onClick: () => void };
  /** Background color override (defaults to white via <AppToaster />). */
  fill?: string;
  /** Class-name overrides for title/description/badge/button. */
  styles?: SileoOptions['styles'];
}

export type NotifyShowOptions = NotifyOptions & { type?: NotifyType };

/** Maps a user-provided key to the sileo toast id currently displayed for it. */
const keyedToasts = new Map<string, string>();

function toSileoOptions({ duration, key, ...rest }: NotifyOptions): SileoOptions {
  return {
    ...rest,
    // antd used seconds and treated 0/null as "sticky"; sileo uses ms.
    duration: duration === null || duration === 0 ? null : duration && duration * 1000,
  };
}

function fire(
  method: (opts: SileoOptions) => string,
  options: NotifyOptions,
  extra?: Partial<SileoOptions>
): string {
  const { key } = options;
  if (key) {
    const previousId = keyedToasts.get(key);
    if (previousId) sileo.dismiss(previousId);
  }
  const id = method({ ...toSileoOptions(options), ...extra });
  if (key) keyedToasts.set(key, id);
  return id;
}

export const notify = {
  success: (options: NotifyOptions) => fire(sileo.success, options),
  error: (options: NotifyOptions) => fire(sileo.error, options),
  warning: (options: NotifyOptions) => fire(sileo.warning, options),
  info: (options: NotifyOptions) => fire(sileo.info, options),
  action: (options: NotifyOptions) => fire(sileo.action, options),
  /** Generic entry point when the variant is dynamic (`type` option). */
  show: ({ type, ...options }: NotifyShowOptions) => fire(sileo.show, options, { type }),
  /** Dismiss by the `key` used when showing, or by a raw sileo id. */
  dismiss: (keyOrId: string) => {
    const id = keyedToasts.get(keyOrId);
    if (id) keyedToasts.delete(keyOrId);
    sileo.dismiss(id ?? keyOrId);
  },
  /** Dismiss every toast (optionally only those at a given position). */
  clear: (position?: SileoPosition) => {
    keyedToasts.clear();
    sileo.clear(position);
  },
};

/**
 * Global toast outlet. Mounted once in the root layout — do not mount twice.
 * White background, top-center, dark text, soft drop shadow; per-toast
 * overrides via `notify`.
 */
export function AppToaster() {
  return (
    <>
      {/* Sileo draws the toast body as an SVG, so a drop-shadow filter (not
          box-shadow) is needed to follow the morphing shape. */}
      <style>{'[data-sileo-toast]{filter:drop-shadow(0 4px 16px rgb(0 0 0 / 0.18))}'}</style>
      <Toaster position="top-center" theme="dark" options={{ fill: '#ffffff' }} />
    </>
  );
}
