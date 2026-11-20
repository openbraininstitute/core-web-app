// Author = clients whose clock moved (or the delete set); Yjs fires this before the PM transaction.
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ySyncPluginKey } from '@tiptap/y-tiptap';
import { clamp, isNil, isNotNil } from 'es-toolkit';
import { match } from 'ts-pattern';

import { entityLookOf } from '@/features/logbook/blocks/kinds';
import { UNKNOWN_ACTOR } from '@/features/logbook/collaboration/actors';

import type { Node as PmNode } from '@tiptap/pm/model';
import type * as Y from 'yjs';
import type {
  IChange,
  IChangeSnapshot,
  ICollaborationChangesOptions,
  IDiff,
  IHighlight,
  IPluginState,
} from '@/features/logbook/types';

export const HL_MS = 5200;
const COALESCE_MS = 8000;
const MAX_EVENTS = 30;

export class ChangeFeed {
  #state: IChangeSnapshot = { events: [], toast: null, seen: {} };
  readonly #listeners = new Set<() => void>();

  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  readonly snapshot = (): IChangeSnapshot => this.#state;

  push(change: IChange): void {
    const [last, ...rest] = this.#state.events;
    const sameRun =
      isNotNil(last) &&
      last.actor.key === change.actor.key &&
      last.blockId === change.blockId &&
      change.at - last.at < COALESCE_MS &&
      last.removed.length === 0 &&
      change.removed.length === 0;
    const merged: IChange = sameRun
      ? {
          ...change,
          id: last.id,
          from: Math.min(last.from, change.from),
          to: Math.max(last.to, change.to),
          // Keep the run's first summary; it says best what it was.
          summary: last.summary,
        }
      : change;
    const events = sameRun ? [merged, ...rest] : [merged, ...this.#state.events];
    this.#state = {
      events: events.slice(0, MAX_EVENTS),
      toast: change.actor.agent ? merged : this.#state.toast,
      seen: { ...this.#state.seen, [change.actor.key]: change.at },
    };
    for (const listener of this.#listeners) listener();
  }

  dismissToast(): void {
    this.#state = { ...this.#state, toast: null };
    for (const listener of this.#listeners) listener();
  }
}

const textOf = (node: PmNode): string => node.textContent.replace(/\s+/g, ' ').trim();

function sectionAt(doc: PmNode, pos: number): string | null {
  let section: string | null = null;
  doc.forEach((block, offset) => {
    if (offset >= pos) return;
    if (block.type.name === 'heading' && Number(block.attrs['level']) <= 2) section = textOf(block);
  });
  return section;
}

export function summaryOf(doc: PmNode, from: number, to: number, removed: string): string {
  const section = sectionAt(doc, from);
  const where = isNil(section) ? '' : ` to ${section}`;
  const inside = isNil(section) ? '' : ` in ${section}`;
  const added: PmNode[] = [];
  doc.forEach((block, offset) => {
    if (offset >= from && offset + block.nodeSize <= to) added.push(block);
  });
  const first = added[0];
  const named = isNil(first)
    ? null
    : match<string, string | null>(first.type.name)
        .with('heading', () => `added ${textOf(first)}`)
        .with('figure', () => `added a figure${where}`)
        .with('table', () => `added a table${where}`)
        .with('codeBlock', () => `added code${where}`)
        .with('callout', () => `added a note${where}`)
        .with(
          'entity',
          () => `linked the ${entityLookOf(String(first.attrs['type'])).label.toLowerCase()}`
        )
        .with('file', () => `attached ${String(first.attrs['name'])}`)
        .otherwise(() => null);
  if (isNotNil(named)) return named;
  if (removed.length > 0 && to > from) return `reworded a sentence${inside}`;
  if (removed.length > 0) return `removed text${inside}`;
  return isNil(section) ? 'edited the text' : `edited ${section}`;
}

const key = new PluginKey<IPluginState>('collaborationChanges');
const EXPIRE = 'expire';

export function diffOf(before: PmNode, after: PmNode): IDiff | null {
  const start = before.content.findDiffStart(after.content);
  if (isNil(start)) return null;
  const end = before.content.findDiffEnd(after.content);
  if (isNil(end)) return null;
  // Repeated nearby text can make the ends cross; back both off by the overlap.
  const overlap = start - Math.min(end.a, end.b);
  const endA = overlap > 0 ? end.a + overlap : end.a;
  const endB = overlap > 0 ? end.b + overlap : end.b;
  return { from: start, to: endB, removed: before.textBetween(start, endA, ' ', ' ').trim() };
}

function topBlockAt(doc: PmNode, pos: number): { node: PmNode; from: number } | null {
  const clamped = clamp(pos, 0, doc.content.size);
  const $pos = doc.resolve(clamped);
  if ($pos.depth === 0) {
    const node = doc.nodeAt(clamped);
    return isNil(node) ? null : { node, from: clamped };
  }
  return { node: $pos.node(1), from: $pos.before(1) };
}

let nextId = 1;

export const CollaborationChanges = Extension.create<ICollaborationChangesOptions>({
  name: 'collaborationChanges',

  addOptions: () => ({
    doc: null,
    feed: null,
    me: UNKNOWN_ACTOR,
    resolve: () => UNKNOWN_ACTOR,
    highlights: () => true,
    ready: () => true,
  }),

  addProseMirrorPlugins() {
    const options = this.options;
    let authors: number[] = [];
    const capture = (transaction: Y.Transaction): void => {
      if (transaction.origin === ySyncPluginKey) {
        authors = [];
        return;
      }
      const moved = [...transaction.afterState].flatMap(([client, clock]) =>
        clock > (transaction.beforeState.get(client) ?? 0) ? [client] : []
      );
      authors = moved.length > 0 ? moved : [...transaction.deleteSet.clients.keys()];
    };

    return [
      new Plugin<IPluginState>({
        key,
        state: {
          init: () => ({ decorations: DecorationSet.empty, change: null }),
          apply(tr, old, before) {
            let decorations = old.decorations.map(tr.mapping, tr.doc);
            if (tr.getMeta(key) === EXPIRE) {
              const cutoff = Date.now() - HL_MS;
              const stale = decorations.find(
                undefined,
                undefined,
                (spec: IHighlight) => spec.at <= cutoff
              );
              decorations = decorations.remove(stale);
            }
            if (!tr.docChanged) return { decorations, change: null };
            const sync: unknown = tr.getMeta(ySyncPluginKey);
            const remote = isNotNil(sync) && Boolean(Reflect.get(Object(sync), 'isChangeOrigin'));
            const diff = diffOf(before.doc, tr.doc);
            const added = isNil(diff)
              ? ''
              : tr.doc.textBetween(diff.from, diff.to, ' ', ' ').trim();
            // Attribute-only change (e.g. UniqueID stamps): not a content edit.
            if (
              isNil(diff) ||
              (tr.doc.content.size === before.doc.content.size && added === diff.removed)
            )
              return { decorations, change: null };
            const { from, to, removed } = diff;
            if (remote && !options.ready()) return { decorations, change: null };
            const [author] = authors;
            const actor = remote
              ? isNil(author)
                ? UNKNOWN_ACTOR
                : options.resolve(author)
              : options.me;
            const now = Date.now();
            if (remote && options.highlights()) {
              const style = `--hl:${actor.colour}`;
              const spec: IHighlight = { at: now };
              const block = topBlockAt(tr.doc, from);
              const tints = [
                ...(to > from
                  ? [Decoration.inline(from, to, { class: 'rl-hl', style }, spec)]
                  : []),
                ...(isNil(block)
                  ? []
                  : [
                      Decoration.node(
                        block.from,
                        block.from + block.node.nodeSize,
                        { class: 'rl-hl-block', style },
                        spec
                      ),
                    ]),
              ];
              decorations = decorations.add(tr.doc, tints);
            }
            const block = topBlockAt(tr.doc, from);
            const blockId: unknown = block?.node.attrs['id'];
            const change: IChange = {
              id: nextId++,
              actor,
              local: !remote,
              at: now,
              from,
              to,
              blockId: typeof blockId === 'string' ? blockId : null,
              summary: summaryOf(tr.doc, from, to, removed),
              removed,
            };
            return { decorations, change };
          },
        },
        props: {
          decorations: (state) => key.getState(state)?.decorations ?? DecorationSet.empty,
        },
        view: (view) => {
          options.doc?.on('beforeObserverCalls', capture);
          let timer: ReturnType<typeof setTimeout> | undefined;
          const scheduleExpiry = (): void => {
            if (isNotNil(timer)) return;
            const decorations = key.getState(view.state)?.decorations;
            if (isNil(decorations) || decorations.find().length === 0) return;
            timer = setTimeout(() => {
              timer = undefined;
              view.dispatch(view.state.tr.setMeta(key, EXPIRE).setMeta('addToHistory', false));
            }, 1000);
          };
          return {
            update: (_view, previous) => {
              const state = key.getState(view.state);
              if (isNotNil(state?.change) && state.change !== key.getState(previous)?.change)
                options.feed?.push(state.change);
              scheduleExpiry();
            },
            destroy: () => {
              options.doc?.off('beforeObserverCalls', capture);
              clearTimeout(timer);
            },
          };
        },
      }),
    ];
  },
});
