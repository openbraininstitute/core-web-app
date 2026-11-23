import { useInfiniteQuery } from '@tanstack/react-query';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { isNil, isNotNil } from 'es-toolkit';
import { useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { useInView } from 'react-intersection-observer';
import { match } from 'ts-pattern';

import { ActorVia } from '@/api/logbook/types';
import { activityQuery, runsOf, summaryOf } from '@/features/logbook/api/activity';
import { peerActor } from '@/features/logbook/collaboration/actors';
import { previewExtensions } from '@/features/logbook/editor/extensions';
import { clip, liveAgoOf, useNow } from '@/features/logbook/helpers';
import { ArtifactsTab } from '@/features/logbook/log/artifacts-tab';
import { useLivePage } from '@/features/logbook/log/context';
import { cardLabelOf, piecesOf } from '@/features/logbook/log/history';
import { Layout, RightTab, ViewMode } from '@/features/logbook/types';
import { Avatar } from '@/ui/molecules/avatar';
import { Icon } from '@/ui/molecules/icon';
import { cn } from '@/utils/css-class';

import type {
  IActivityRun,
  IChange,
  ILogShared,
  ISidePaneProps,
  TRightTab,
} from '@/features/logbook/types';

const SUB = 'text-[12px] text-neutral-4';
const PIECE = 'flex items-start gap-[10px]';
const SEGMENT =
  'relative h-[30px] rounded-full bg-transparent px-[14px] text-[12px] font-bold tracking-[0.06em] text-neutral-4 uppercase aria-pressed:bg-white aria-pressed:text-primary-9 aria-pressed:shadow-seg-on';

function PreviewTab() {
  const { document } = useLivePage();
  const preview = useEditor({ extensions: previewExtensions(document), editable: false }, [
    document,
  ]);
  return (
    <div className="scroll-thin min-h-0 flex-[1_1_0] overflow-y-auto">
      <article className="mx-auto max-w-[760px] pt-4 pr-11 pb-[72px] pl-8 max-md:px-4 max-md:pt-3">
        <EditorContent editor={preview} className="rl-editor rl-editor-read" />
      </article>
    </div>
  );
}

function ActivityRow({
  change,
  now,
  onShow,
}: {
  readonly change: IChange;
  readonly now: number;
  readonly onShow: () => void;
}) {
  return (
    <li className="group relative flex gap-3 pb-4">
      <span className="absolute top-7 bottom-0 left-[13px] w-0.5 bg-rule-softer group-last:hidden" />
      <Avatar actor={change.actor} size={28} />
      <div className="min-w-0 flex-1 pt-0.5 text-[13px] leading-[1.45]">
        <div>
          <strong>{change.local ? 'You' : change.actor.name}</strong> {change.summary}
        </div>
        {change.removed.length > 0 ? (
          <div className="text-[12px] text-removed">
            was <s>“{clip(change.removed, 60)}”</s>
          </div>
        ) : null}
        <div className={SUB}>
          {change.actor.agent ? 'Agent · ' : ''}
          {liveAgoOf(change.at, now)}
        </div>
      </div>
      <button
        type="button"
        className="h-[26px] flex-none rounded-full bg-fill-2 px-[10px] text-[12px] font-bold text-primary-9"
        onClick={onShow}
      >
        Show
      </button>
    </li>
  );
}

function SavedRow({
  run,
  me,
  now,
}: {
  readonly run: IActivityRun;
  readonly me: string;
  readonly now: number;
}) {
  const agent = run.via === ActorVia.Agent;
  const [open, setOpen] = useState(false);
  const box = useId();
  const removed = run.removed.trim();
  return (
    <li className="group relative flex gap-3 pb-4">
      <span className="absolute top-7 bottom-0 left-[13px] w-0.5 bg-rule-softer group-last:hidden" />
      <Avatar actor={peerActor(run)} size={28} />
      <div className="min-w-0 flex-1 pt-0.5 text-[13px] leading-[1.45]">
        <div>
          <strong>{run.userId === me && !agent ? 'You' : run.label}</strong> {summaryOf(run)}
        </div>
        <div className={SUB}>
          {agent ? 'Agent · ' : ''}
          {liveAgoOf(run.to, now)}
        </div>
        {removed.length > 0 ? (
          <div
            id={box}
            className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none data-[open=true]:grid-rows-[1fr]"
            data-open={open}
            inert={!open}
          >
            <div className="min-h-0 overflow-hidden">
              <p className="m-0 mt-2 rounded-xl border border-rule-soft bg-neutral-1/60 px-3 py-2.5 text-[12.5px] leading-relaxed break-words whitespace-pre-wrap text-neutral-10">
                {removed}
              </p>
            </div>
          </div>
        ) : null}
      </div>
      {removed.length > 0 ? (
        <button
          type="button"
          className="grid size-7 flex-none place-items-center self-start rounded-full bg-fill-2 text-neutral-10 transition-colors hover:bg-fill-item-hover aria-expanded:bg-primary-0 aria-expanded:text-primary-9"
          aria-label={open ? 'Hide the removed text' : 'Show the removed text'}
          title={open ? 'Hide the removed text' : 'Show the removed text'}
          aria-expanded={open}
          aria-controls={box}
          onClick={() => setOpen((was) => !was)}
        >
          <span className="grid transition-transform duration-200 motion-reduce:transition-none [[aria-expanded=true]>&]:rotate-180">
            <Icon name="chevronDown" size={14} stroke={2.4} />
          </span>
        </button>
      ) : null}
    </li>
  );
}

function HistoryTab(props: ILogShared) {
  const { editor, selection, resolve, feed } = props;
  const now = useNow(1000);
  const changes = useSyncExternalStore(feed.subscribe, feed.snapshot);
  const saved = useInfiniteQuery(activityQuery(props.project, props.logId, props.openedAt));
  const earlier = useMemo(
    () =>
      runsOf(
        (saved.data?.pages ?? [])
          .flatMap((page) => page.items)
          .filter((entry) => entry.pageId === props.page.id)
      ),
    [saved.data, props.page.id]
  );
  const { ref: end, inView: atEnd } = useInView({ rootMargin: '300px', fallbackInView: true });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = saved;
  useEffect(() => {
    if (atEnd && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [atEnd, hasNextPage, isFetchingNextPage, fetchNextPage]);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => current.state,
    equalityFn: (a, b) => a.doc === b?.doc,
  });
  const size = state.doc.content.size;
  const from = isNil(selection) ? null : Math.min(selection.from, size);
  const to = isNil(selection) ? null : Math.min(selection.to, size);
  const { pieces, clients } = useMemo(() => {
    const seen = new Set<number>();
    const found =
      isNil(from) || isNil(to)
        ? []
        : piecesOf(state, from, to, (client) => {
            seen.add(client);
            return resolve(client);
          });
    return { pieces: found, clients: [...seen] };
  }, [state, from, to, resolve]);
  const { learnWriters } = props;
  useEffect(() => learnWriters(clients), [learnWriters, clients]);
  const replaced =
    isNil(from) || isNil(to)
      ? []
      : changes.events.filter((e) => e.removed.length > 0 && e.from < to && e.to >= from);
  const excerpt =
    isNil(from) || isNil(to)
      ? ''
      : state.doc.textBetween(from, to, ' ', (leaf) => (leaf.isBlock ? cardLabelOf(leaf) : ' '));
  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-10">
      {isNil(selection) ? (
        <p className="mx-0 mt-0 mb-5 rounded-xl bg-soft px-[14px] py-3 text-[13px] leading-[1.5] text-neutral-4">
          Select text in the editor, or use the clock next to a block, to see who wrote it.
        </p>
      ) : (
        <div className="mb-5 rounded-2xl bg-soft px-4 py-[14px]">
          <div className="flex items-center justify-between">
            <span className="label-caps">Selected text</span>
            <button
              type="button"
              className="icon-btn size-[26px]"
              aria-label="Clear selection"
              onClick={() => props.setSelection(null)}
            >
              <Icon name="close" size={12} stroke={2.4} />
            </button>
          </div>
          <p className="mx-0 mt-1.5 mb-3 text-[14px] leading-[1.55] italic">
            “{clip(excerpt, 160)}”
          </p>
          <ul className="m-0 flex list-none flex-col gap-[10px] p-0 text-[13px]">
            {pieces.map((piece, index) => (
              <li key={index} className={PIECE}>
                <Avatar actor={piece.actor} size={26} />
                <div>
                  <div>
                    <strong>
                      {piece.actor.key === props.meActor.key ? 'You' : piece.actor.name}
                    </strong>{' '}
                    wrote “{piece.text}”
                  </div>
                  <div className={SUB}>{piece.actor.agent ? 'Agent' : 'Person'}</div>
                </div>
              </li>
            ))}
            {replaced.map((change) => (
              <li key={`r${change.id}`} className={PIECE}>
                <Avatar actor={change.actor} size={26} />
                <div>
                  <div>
                    <strong>{change.actor.name}</strong> replaced{' '}
                    <s className="text-[12px] text-removed">“{clip(change.removed, 70)}”</s>
                  </div>
                  <div className={SUB}>{liveAgoOf(change.at, now)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mb-2 flex items-center justify-between">
        <span className="label-caps">Activity</span>
        <span className={SUB}>
          {changes.events.length} {changes.events.length === 1 ? 'change' : 'changes'} now
        </span>
      </div>
      <ol className="m-0 list-none p-0">
        {changes.events.map((change) => (
          <ActivityRow
            key={change.id}
            change={change}
            now={now}
            onShow={() => props.flash(change.from, change.to)}
          />
        ))}
      </ol>
      {changes.events.length === 0 ? (
        <p className={cn(SUB, 'mt-0 mb-4')}>Changes made while this log is open show here.</p>
      ) : null}
      <div className="mt-2 mb-2 flex items-center justify-between border-t border-rule-soft pt-4">
        <span className="label-caps">Earlier</span>
        {saved.isPending ? <span className={SUB}>Loading…</span> : null}
      </div>
      {saved.isError && isNil(saved.data) ? (
        <p className={SUB}>The earlier activity could not be read: {saved.error.message}</p>
      ) : saved.isSuccess && earlier.length === 0 ? (
        <p className={SUB}>Nothing saved before this visit.</p>
      ) : (
        <ol className="m-0 list-none p-0">
          {earlier.map((run) => (
            <SavedRow key={run.key} run={run} me={props.me.userId} now={now} />
          ))}
        </ol>
      )}
      <div ref={end} aria-hidden="true" />
      {isFetchingNextPage ? <p className={SUB}>Loading older activity…</p> : null}
      {saved.isFetchNextPageError ? (
        <button
          type="button"
          className="h-[26px] rounded-full bg-fill-2 px-[10px] text-[12px] font-bold text-primary-9"
          onClick={() => void fetchNextPage()}
        >
          Older activity did not load. Try again
        </button>
      ) : null}
    </div>
  );
}

const TABS: readonly { readonly tab: TRightTab; readonly label: string }[] = [
  { tab: RightTab.Preview, label: 'Preview' },
  { tab: RightTab.History, label: 'History' },
  { tab: RightTab.Artifacts, label: 'Artifacts' },
];

export function SidePane(props: ISidePaneProps) {
  const narrow = props.layout === Layout.Narrow;
  return (
    <section
      className="logbook-card @container/pane relative flex min-h-0 min-w-0 flex-[1_1_0] flex-col overflow-hidden"
      aria-label={TABS.find((t) => t.tab === props.tab)?.label ?? 'Side pane'}
    >
      {narrow ? null : (
        <header className="flex h-14 flex-none items-center gap-2 border-b border-rule pr-2 pl-4">
          {/* biome-ignore lint/a11y/useSemanticElements: a segmented button group, not a form fieldset */}
          <div
            className="flex gap-0.5 rounded-full bg-fill-2 p-0.5"
            role="group"
            aria-label="Side pane"
          >
            {TABS.map(({ tab, label }) => (
              <button
                key={tab}
                type="button"
                className={SEGMENT}
                aria-pressed={props.tab === tab}
                onClick={() => props.setTab(tab)}
              >
                {label}
                {tab === RightTab.History && isNotNil(props.selection) ? (
                  <span className="absolute top-[5px] right-1.5 size-1.5 rounded-full bg-primary-6" />
                ) : null}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {props.editorShut ? (
              <button
                type="button"
                className="inline-flex h-[38px] items-center gap-1.5 rounded-full bg-green-main px-[14px] text-[14px] font-bold text-white"
                onClick={() => props.onMode(ViewMode.Read)}
              >
                <Icon name="check" size={14} stroke={2.6} />
                Close
              </button>
            ) : null}
            {props.canShut ? (
              <button
                type="button"
                className="icon-btn size-8"
                aria-label="Close the side pane"
                title="Close the side pane"
                onClick={props.onShut}
              >
                <Icon name="close" size={14} stroke={2.4} />
              </button>
            ) : null}
          </div>
        </header>
      )}
      {match(props.tab)
        .with(RightTab.History, () => <HistoryTab {...props} />)
        .with(RightTab.Artifacts, () => (
          <ArtifactsTab active={props.artifactId} onOpen={props.openArtifact} />
        ))
        .with(RightTab.Preview, () => <PreviewTab />)
        .exhaustive()}
    </section>
  );
}
