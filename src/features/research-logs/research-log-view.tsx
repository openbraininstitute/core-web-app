'use client';

import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  FileAddOutlined,
  LinkOutlined,
  LoadingOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { EditorView } from '@codemirror/view';
import { App } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  getResearchLogDocument,
  getResearchLogFiles,
} from '@/api/entitycore/types/entities/research-log';
import { BOX_CLASS } from '@/features/scan-config/components/shared/box-class';
import { Button } from '@/ui/molecules/button';
import { Skeleton } from '@/ui/molecules/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import { joinBlocks, splitBlocks } from './blocks';
import { dirOf, newPagePath } from './files';
import {
  useDeleteResearchLog,
  useResearchLog,
  useResearchLogDocument,
  useResearchLogFile,
  useResearchLogFileList,
  useResearchLogHref,
  useSaveResearchLog,
} from './hooks';
import { LinkEntitiesWindow, type LinkedEntity } from './link-entities-window';
import { AgentActivityToast, AgentHighlightStyle } from './live/agent-activity';
import { EditWindows } from './live/edit-windows';
import { insertParagraphs, LiveEditor } from './live/live-editor';
import { LivePresence } from './live/presence';
import { agentRanges, useAgentActivity } from './live/use-agent-activity';
import { useLiveAutosave } from './live/use-live-autosave';
import { useLiveLog, useLiveText } from './live/use-live-log';
import { useCanEditLog, useEditLogDetails } from './log-actions';
import { ResearchLogMarkdown } from './markdown';
import { useShutRailWhile } from './research-logs-layout';

import type { ReactNode } from 'react';
import type { IResearchLog } from '@/api/entitycore/types/entities/research-log';

export function ResearchLogView({ id }: { id: string }) {
  const { data: log, isLoading, isError } = useResearchLog(id);
  if (isLoading) return <Skeleton className="m-6 h-64 w-2/3 rounded-xl" />;
  if (isError || !log)
    return <p className="text-neutral-5 p-6">This research log was not found.</p>;
  return <Loaded key={log.id} log={log} />;
}

function Loaded({ log }: { log: IResearchLog }) {
  const router = useRouter();
  const params = useSearchParams();
  const href = useResearchLogHref();
  const { notification, modal } = App.useApp();
  const doc = getResearchLogDocument(log);
  const filesAssetId = getResearchLogFiles(log)?.id;
  const { data: saved, isLoading } = useResearchLogDocument(log.id, log);
  const save = useSaveResearchLog(log.id);
  const remove = useDeleteResearchLog();
  const editDetails = useEditLogDetails();
  const canEditLog = useCanEditLog(log);

  // a markdown file kept beside the log, which a link in the log opened in place of it
  const filePath = params.get('file');
  const openFile = (path: string) =>
    router.push(`${href(log.id)}?file=${encodeURIComponent(path)}`);
  const [editing, setEditing] = useState(params.get('edit') === '1');

  // the document in view is the log (key '') or the page it opened (key = the page's path)
  const docKey = filePath ?? '';
  const {
    data: pageSaved,
    isLoading: pageLoading,
    isError: pageMissing,
  } = useResearchLogFile(log.id, filesAssetId, filePath);
  const { data: fileList } = useResearchLogFileList(log.id, filesAssetId);
  // the blocks of each document edited so far; the others read as saved
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  // what a page held when it was first changed (as blocks join it), or null for a page made here
  const [bases, setBases] = useState<Record<string, string | null>>({});
  const [active, setActive] = useState<number | null>(null);
  // the block last worked in: new text and links go below it, and below the last block if none
  const [anchor, setAnchor] = useState<number | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  // a block's place means nothing in another document
  // biome-ignore lint/correctness/useExhaustiveDependencies: moving to another document is the trigger
  useEffect(() => {
    setActive(null);
    setAnchor(null);
  }, [docKey]);

  const sourceText = docKey === '' ? saved : pageSaved;
  const loadingDoc = (docKey === '' ? isLoading : pageLoading) && drafts[docKey] === undefined;
  const current = drafts[docKey] ?? splitBlocks(sourceText ?? '');
  const markdown = joinBlocks(current);
  const mainMarkdown = joinBlocks(drafts[''] ?? splitBlocks(saved ?? ''));
  const mainChanged = mainMarkdown !== joinBlocks(splitBlocks(saved ?? ''));
  // the pages written or changed; one made here has no base, so it always counts
  const pages = Object.fromEntries(
    Object.entries(drafts)
      .filter(([key]) => key !== '')
      .map(([key, pageBlocks]) => [key, joinBlocks(pageBlocks)] as const)
      .filter(([key, text]) => text !== bases[key])
  );
  const hasPages = Object.keys(pages).length > 0;
  const dirty = mainChanged || hasPages;

  // live co-editing of the log itself (not its pages), once the shared document has arrived;
  // without a co-editing server, or before it answers, the log is edited the old way
  const live = useLiveLog(log.id);
  const liveMode = !!live?.ready && !filePath;
  const liveText = useLiveText(live?.ready ? live.text : undefined);
  const autosave = useLiveAutosave(live, log.id);
  const editorView = useRef<EditorView | null>(null);
  const liveAwareness = live?.provider.awareness;
  useEffect(() => {
    liveAwareness?.setLocalStateField('editing', editing && !filePath);
  }, [liveAwareness, editing, filePath]);
  // the source and the report side by side, each in a window of its own
  const liveEditing = !!live && liveMode && editing;
  // an edit takes the rail's width; it opens again after
  useShutRailWhile(editing);

  // what an agent just wrote: tinted where it shows, and announced with the way to it
  const agentChanges = useAgentActivity(live);
  const agentKey = agentChanges.map((c) => c.id).join(',');
  const agentTextRanges = agentRanges(agentChanges, live?.doc);
  const rootRef = useRef<HTMLDivElement>(null);
  const showAgentChange = () => {
    const latest = agentChanges[agentChanges.length - 1];
    const range = latest ? agentRanges([latest], live?.doc)[0] : undefined;
    if (!range) return;
    editorView.current?.dispatch({
      effects: EditorView.scrollIntoView(range.from, { y: 'center' }),
    });
    // and the rendered report's tinted block, in the preview or the reading view
    for (const report of rootRef.current?.querySelectorAll('[data-report]') ?? []) {
      const blocks = report.querySelectorAll('div.rl-agent-new');
      blocks[blocks.length - 1]?.scrollIntoView({ block: 'center' });
    }
  };

  /** Live edits are already everyone's: Done saves anything left unsaved. */
  const onLiveDone = async () => {
    try {
      await autosave.saveNow();
      setEditing(false);
      router.replace(href(log.id));
    } catch (e) {
      notification.error({ message: 'Could not save', description: String(e) });
    }
  };

  /** Writes the blocks of the document in view. */
  const writeBlocks = (next: string[]) => {
    if (docKey !== '' && !(docKey in bases)) {
      setBases((b) => ({ ...b, [docKey]: joinBlocks(splitBlocks(sourceText ?? '')) }));
    }
    setDrafts((d) => ({ ...d, [docKey]: next }));
  };

  /** Writes a block back; a blank draft removes it and a draft with blank lines becomes several. */
  const commit = (index: number, draft: string) => {
    const parts = splitBlocks(draft);
    const next = [...current];
    next.splice(index, 1, ...parts);
    writeBlocks(next);
    setActive(null);
    // a blank draft removes the block, so the anchor falls back to the one before it
    setAnchor(index + parts.length - 1);
  };

  /** Puts blocks below the anchor, or at the end when none was worked in. */
  const insertBlocks = (sources: string[]) => {
    const at = anchor === null ? current.length : Math.min(anchor + 1, current.length);
    const next = [...current];
    next.splice(at, 0, ...sources);
    writeBlocks(next);
    return at;
  };

  const addBlock = () => {
    const at = insertBlocks(['']);
    setActive(at);
    setAnchor(at);
  };

  /** A new page beside the document in view: a link to it goes in, and the page opens to write in. */
  const createPage = (title: string) => {
    const path = newPagePath(title, dirOf(docKey), [...(fileList ?? []), ...Object.keys(drafts)]);
    insertBlocks([`[${title.replace(/[[\]]/g, '')}](${path.slice(path.lastIndexOf('/') + 1)})`]);
    setDrafts((d) => ({ ...d, [path]: [`# ${title}`] }));
    setBases((b) => ({ ...b, [path]: null }));
    openFile(path);
  };

  const cancel = () => {
    setDrafts({});
    setBases({});
    setActive(null);
    setAnchor(null);
    setEditing(false);
    // a page made in this edit goes with it
    if (filePath && bases[filePath] === null) router.replace(href(log.id));
  };

  const onSave = async () => {
    try {
      await save.mutateAsync({
        ...(mainChanged ? { markdown: mainMarkdown, previousAssetId: doc?.id } : {}),
        ...(hasPages ? { pages, filesAssetId } : {}),
      });
      setEditing(false);
      setActive(null);
      setAnchor(null);
      // the log keeps its text, so it does not fall back to the old document while the new one
      // loads; pages read from the folder just written
      setDrafts((d): Record<string, string[]> => (d[''] ? { '': d[''] } : {}));
      setBases({});
      router.replace(
        filePath ? `${href(log.id)}?file=${encodeURIComponent(filePath)}` : href(log.id)
      );
    } catch (e) {
      notification.error({ message: 'Could not save', description: String(e) });
    }
  };

  const onDelete = () =>
    modal.confirm({
      title: 'Delete this research log?',
      content: 'The log and its document are deleted. Entities it links to are not touched.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        await remove.mutateAsync(log.id);
        router.push(href());
      },
    });

  const linkEntities = (entities: LinkedEntity[]) => {
    const origin = window.location.origin;
    const links = entities.map(
      (entity) => `[${entity.name.replace(/[[\]]/g, '')}](${origin}/app/entity/${entity.id})`
    );
    if (liveMode && editorView.current) {
      insertParagraphs(editorView.current, links);
      setLinkOpen(false);
      return;
    }
    const at = insertBlocks(links);
    setAnchor(at + entities.length - 1);
    setLinkOpen(false);
  };

  // what the header names: the log, or the page opened from it
  const headerTitle = filePath ? (filePath.split('/').pop() ?? filePath) : log.name;

  return (
    <div ref={rootRef} className="relative flex h-full min-h-0 flex-col gap-4">
      {live && <AgentHighlightStyle />}
      {!liveEditing && (
        <div className={cn(BOX_CLASS, 'flex min-h-0 flex-1 flex-col overflow-hidden')}>
          {/* holds still while the report scrolls under it: the way back, the title, the actions */}
          <header className="border-neutral-2 shrink-0 border-b px-6 pt-3 pb-3">
            <div className="flex items-center gap-3">
              {editing && !filePath ? null : (
                <IconAction
                  label={filePath ? `Back to ${log.name}` : 'All research logs'}
                  onClick={() => router.push(filePath ? href(log.id) : href())}
                  testId="back-research-log"
                >
                  <ArrowLeftOutlined />
                </IconAction>
              )}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <h1
                  className="text-primary-9 min-w-0 truncate text-2xl font-bold"
                  title={headerTitle}
                >
                  {headerTitle}
                </h1>
                {/* the log's own name and description, apart from its document */}
                {!filePath && canEditLog && (
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Edit name and description"
                        onClick={() => editDetails(log)}
                        className="text-neutral-4 hover:text-primary-9 hover:bg-neutral-1 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors"
                      >
                        <EditOutlined />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Edit name and description</TooltipContent>
                  </Tooltip>
                )}
              </div>
              {live && !filePath && <LivePresence live={live} save={autosave} />}
              <div className="flex shrink-0 gap-2">
                {editing ? (
                  <>
                    <IconAction label="Cancel" onClick={cancel}>
                      <CloseOutlined />
                    </IconAction>
                    <IconAction
                      label={save.isPending ? 'Saving…' : 'Save'}
                      onClick={onSave}
                      disabled={!dirty || save.isPending}
                      className="bg-accent-dark text-white hover:bg-accent-dark/90"
                    >
                      <CheckOutlined />
                    </IconAction>
                  </>
                ) : !filePath || (filesAssetId && !pageMissing) ? (
                  <IconAction
                    label="Edit"
                    onClick={() => setEditing(true)}
                    testId="edit-research-log"
                    className="bg-primary-9 text-white hover:bg-primary-9/90"
                  >
                    <EditOutlined />
                  </IconAction>
                ) : null}
                {!editing && (
                  <IconAction
                    label="Delete"
                    onClick={onDelete}
                    disabled={remove.isPending}
                    testId="delete-research-log"
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    <DeleteOutlined />
                  </IconAction>
                )}
              </div>
            </div>
            {editing && !liveMode && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  rounded
                  variant="outline"
                  size="sm"
                  className="border-none shadow-md"
                  onClick={addBlock}
                >
                  <PlusOutlined /> Text
                </Button>
                <Button
                  rounded
                  variant="outline"
                  size="sm"
                  className="border-none shadow-md"
                  onClick={() => setLinkOpen(true)}
                >
                  <LinkOutlined /> Link entities
                </Button>
                <NewPageButton onCreate={createPage} />
              </div>
            )}
          </header>

          <div data-report className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-8 pt-4 pb-8">
            {filePath && !editing ? (
              <LogFile
                logId={log.id}
                path={filePath}
                filesAssetId={filesAssetId}
                onOpen={openFile}
              />
            ) : (
              <article className="mx-auto max-w-3xl">
                {!filePath && (
                  <>
                    {log.description ? (
                      <p className="text-primary-9 text-lg">{log.description}</p>
                    ) : null}
                    <p className="text-neutral-4 border-neutral-2 mt-1 mb-4 border-b pb-4 text-xs">
                      {log.created_by?.pref_label ?? 'Unknown author'} · updated{' '}
                      {new Date(log.update_date).toLocaleString()}
                    </p>
                  </>
                )}

                {liveMode ? (
                  <ResearchLogMarkdown
                    markdown={liveText}
                    logId={log.id}
                    filesAssetId={filesAssetId}
                    onOpenFile={openFile}
                    highlights={agentTextRanges}
                  />
                ) : loadingDoc ? (
                  <Skeleton className="h-48 w-full rounded-xl" />
                ) : editing ? (
                  current.map((source, i) => (
                    <EditableBlock
                      // biome-ignore lint/suspicious/noArrayIndexKey: blocks have no identity beyond position
                      key={i}
                      source={source}
                      active={active === i}
                      onActivate={() => {
                        setActive(i);
                        setAnchor(i);
                      }}
                      onCommit={(draft) => commit(i, draft)}
                      logId={log.id}
                      filesAssetId={filesAssetId}
                      basePath={dirOf(docKey)}
                    />
                  ))
                ) : (
                  <ResearchLogMarkdown
                    markdown={markdown}
                    logId={log.id}
                    filesAssetId={filesAssetId}
                    onOpenFile={openFile}
                  />
                )}
              </article>
            )}
          </div>
        </div>
      )}

      {liveEditing && live && (
        <EditWindows
          // who has it open, how saving stands, and the way out, in whichever window is first
          actions={
            <>
              <LivePresence live={live} save={autosave} />
              <SaveAndClose
                saving={autosave.saving}
                dirty={autosave.dirty && !live.readOnly}
                onClick={onLiveDone}
              />
            </>
          }
          // the source, as everyone types it
          start={{
            title: 'Markdown',
            actions: (
              <Button
                rounded
                variant="outline"
                size="sm"
                className="bg-neutral-1 border-none shadow-none"
                onClick={() => setLinkOpen(true)}
                disabled={live.readOnly}
              >
                <LinkOutlined /> Link entities
              </Button>
            ),
            content: (
              <LiveEditor
                text={live.text}
                awareness={live.provider.awareness}
                readOnly={live.readOnly}
                onView={(view) => {
                  editorView.current = view;
                }}
                agentChanges={{ key: agentKey, ranges: agentTextRanges }}
                className="px-6 pt-4"
              />
            ),
          }}
          // the report it makes, as it will read
          end={{
            title: 'Preview',
            content: (
              <article data-report className="mx-auto max-w-3xl px-8 pt-4 pb-8">
                <ResearchLogMarkdown
                  markdown={liveText}
                  logId={log.id}
                  filesAssetId={filesAssetId}
                  onOpenFile={openFile}
                  highlights={agentTextRanges}
                />
              </article>
            ),
          }}
        />
      )}

      {liveMode && <AgentActivityToast changes={agentChanges} onShow={showAgentChange} />}

      {linkOpen && <LinkEntitiesWindow onAdd={linkEntities} onClose={() => setLinkOpen(false)} />}
    </div>
  );
}

/** A markdown file from the log's files folder, shown in place of the log, with the way back. */
function LogFile({
  logId,
  path,
  filesAssetId,
  onOpen,
}: {
  logId: string;
  path: string;
  filesAssetId?: string;
  onOpen: (path: string) => void;
}) {
  const { data, isLoading, isError } = useResearchLogFile(logId, filesAssetId, path);
  return (
    <article className="mx-auto max-w-3xl">
      {!filesAssetId ? (
        <p className="text-neutral-5">This log has no files folder to read {path} from.</p>
      ) : isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : isError ? (
        <p className="text-neutral-5">{path} was not found in this log&apos;s files.</p>
      ) : (
        <ResearchLogMarkdown
          markdown={data ?? ''}
          logId={logId}
          filesAssetId={filesAssetId}
          basePath={dirOf(path)}
          onOpenFile={onOpen}
        />
      )}
    </article>
  );
}

/** Leaves live editing, saving first whatever the autosave has not yet; a dot while there is some. */
function SaveAndClose({
  saving,
  dirty,
  onClick,
}: {
  saving: boolean;
  dirty: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="bg-accent-dark hover:bg-accent-dark/90 relative flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap text-white shadow-md transition-colors disabled:opacity-70"
    >
      {saving ? <LoadingOutlined /> : <CheckOutlined />}
      {saving ? 'Saving…' : dirty ? 'Save & close' : 'Close'}
      {dirty && !saving && (
        <>
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-amber-400 ring-2 ring-white"
          />
          <span className="sr-only">(unsaved changes)</span>
        </>
      )}
    </button>
  );
}

/** A round icon-only button with its name on hover. */
function IconAction({
  label,
  onClick,
  disabled,
  className,
  testId,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          data-testid={testId}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'flex size-10 items-center justify-center rounded-full text-base shadow-md transition-colors disabled:opacity-60',
            className ?? 'text-primary-9 bg-white hover:bg-neutral-1'
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

/** One paragraph, heading, list, table or card: rendered as read, turns into its markdown on click. */
function EditableBlock({
  source,
  active,
  onActivate,
  onCommit,
  logId,
  filesAssetId,
  basePath,
}: {
  source: string;
  active: boolean;
  onActivate: () => void;
  onCommit: (draft: string) => void;
  logId: string;
  filesAssetId?: string;
  /** The folder of the page being edited, for its relative images. */
  basePath?: string;
}) {
  const [draft, setDraft] = useState(source);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (active) setDraft(source);
  }, [active, source]);

  // grow with the text, so the block never scrolls inside itself
  // biome-ignore lint/correctness/useExhaustiveDependencies: the draft is what changes the height
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, active]);

  // a block opened for editing takes the caret, at the end of its text
  useEffect(() => {
    const el = area.current;
    if (!active || !el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [active]);

  if (active) {
    return (
      <textarea
        ref={area}
        value={draft}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCommit(draft);
        }}
        className="bg-primary-1/60 text-primary-9 -mx-2 my-1 block w-[calc(100%+1rem)] resize-none overflow-hidden rounded-lg px-2 py-0.5 font-mono text-sm leading-relaxed outline-none"
      />
    );
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the textarea it opens is the keyboard path
    // biome-ignore lint/a11y/noStaticElementInteractions: see above
    <div
      onClickCapture={(e) => {
        // a link inside a block must edit it, not navigate away from unsaved work
        e.preventDefault();
        e.stopPropagation();
        onActivate();
      }}
      className="hover:bg-primary-1/50 -mx-2 cursor-text rounded-lg px-2 transition-colors"
    >
      <ResearchLogMarkdown
        markdown={source}
        logId={logId}
        filesAssetId={filesAssetId}
        basePath={basePath}
      />
    </div>
  );
}

/** Asks for a title, then makes a linked markdown page of that name. */
function NewPageButton({ onCreate }: { onCreate: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setTitle('');
  };

  if (!open) {
    return (
      <Button
        rounded
        variant="outline"
        size="sm"
        className="border-none shadow-md"
        title="Add a linked markdown page"
        onClick={() => setOpen(true)}
      >
        <FileAddOutlined /> Linked page
      </Button>
    );
  }
  return (
    <input
      ref={input}
      value={title}
      placeholder="Page title, then Enter"
      aria-label="Page title"
      onChange={(e) => setTitle(e.target.value)}
      onBlur={close}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
        if (e.key === 'Enter' && title.trim()) {
          onCreate(title.trim());
          close();
        }
      }}
      className="text-primary-9 h-8 w-56 rounded-full bg-white px-4 text-sm shadow-md outline-none"
    />
  );
}
