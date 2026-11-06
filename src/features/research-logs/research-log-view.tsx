'use client';

import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { App } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { getResearchLogDocument } from '@/api/entitycore/types/entities/research-log';
import { Button } from '@/ui/molecules/button';
import { Skeleton } from '@/ui/molecules/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import { joinBlocks, splitBlocks } from './blocks';
import { type LinkedEntity, LinkEntitiesWindow } from './link-entities-window';
import {
  useDeleteResearchLog,
  useResearchLog,
  useResearchLogDocument,
  useResearchLogHref,
  useSaveResearchLog,
} from './hooks';
import { ResearchLogMarkdown } from './markdown';

import type { ReactNode } from 'react';
import type { IResearchLog } from '@/api/entitycore/types/entities/research-log';


/** A text field set in the typography it edits, so entering edit mode changes nothing visually. */
const inlineField =
  'rounded-lg border-0 bg-transparent p-0 outline-none transition-colors placeholder:text-neutral-3 hover:bg-primary-1/50 focus:bg-primary-1/60 -mx-2 w-[calc(100%+1rem)] px-2';

export function ResearchLogView({ id }: { id: string }) {
  const { data: log, isLoading, isError } = useResearchLog(id);
  if (isLoading) return <Skeleton className="m-6 h-64 w-2/3 rounded-xl" />;
  if (isError || !log) return <p className="text-neutral-5 p-6">This research log was not found.</p>;
  return <Loaded key={log.id} log={log} />;
}

function Loaded({ log }: { log: IResearchLog }) {
  const router = useRouter();
  const params = useSearchParams();
  const href = useResearchLogHref();
  const { notification, modal } = App.useApp();
  const doc = getResearchLogDocument(log);
  const filesAssetId = log.assets?.find((a) => a.label === 'research_log_files')?.id;
  const { data: saved, isLoading } = useResearchLogDocument(log.id, log);
  const save = useSaveResearchLog(log.id);
  const remove = useDeleteResearchLog();

  const [editing, setEditing] = useState(params.get('edit') === '1');
  const [name, setName] = useState(log.name);
  const [description, setDescription] = useState(log.description);
  const [blocks, setBlocks] = useState<string[] | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  useEffect(() => {
    if (saved !== undefined && blocks === null) setBlocks(splitBlocks(saved));
  }, [saved, blocks]);

  const current = blocks ?? splitBlocks(saved ?? '');
  const markdown = joinBlocks(current);
  const dirty =
    name !== log.name ||
    description !== log.description ||
    markdown !== joinBlocks(splitBlocks(saved ?? ''));

  /** Writes a block back; a blank draft removes it and a draft with blank lines becomes several. */
  const commit = (index: number, draft: string) => {
    const next = [...current];
    next.splice(index, 1, ...splitBlocks(draft));
    setBlocks(next);
    setActive(null);
  };

  const addBlock = (source: string) => {
    setBlocks([...current, source]);
    setActive(current.length);
  };

  const cancel = () => {
    setName(log.name);
    setDescription(log.description);
    setBlocks(splitBlocks(saved ?? ''));
    setActive(null);
    setEditing(false);
  };

  const onSave = async () => {
    try {
      await save.mutateAsync({
        meta: {
          ...(name.trim() && name !== log.name ? { name: name.trim() } : {}),
          ...(description !== log.description ? { description } : {}),
        },
        ...(markdown !== joinBlocks(splitBlocks(saved ?? ''))
          ? { markdown, previousAssetId: doc?.id }
          : {}),
      });
      setEditing(false);
      setActive(null);
      router.replace(href(log.id));
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
    setBlocks([
      ...current,
      ...entities.map(
        (entity) =>
          `[${entity.name.replace(/[[\]]/g, '')}](${origin}/app/entity/${entity.id})`
      ),
    ]);
    setLinkOpen(false);
  };

  return (
    <div className="flex min-h-full flex-col gap-4 p-1">
      <div className="flex-1 rounded-2xl bg-white p-8 shadow-md">
        {/* zero-height and sticky, so the buttons float over the report while it scrolls */}
        <div className="pointer-events-none sticky top-3 z-10 -mt-4 -mr-4 flex h-0 justify-end gap-2 [&>*]:pointer-events-auto">
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
          ) : (
            <IconAction
              label="Edit"
              onClick={() => setEditing(true)}
              testId="edit-research-log"
              className="bg-primary-9 text-white hover:bg-primary-9/90"
            >
              <EditOutlined />
            </IconAction>
          )}
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
        <article className="mx-auto max-w-3xl">
          <div className="pr-28">
          {editing ? (
            <GrowingField
              value={name}
              onChange={setName}
              placeholder="Name"
              label="Name"
              className="text-primary-9 text-3xl font-bold"
            />
          ) : (
            <h1 className="text-primary-9 text-3xl font-bold">{log.name}</h1>
          )}
          {editing ? (
            <GrowingField
              value={description}
              onChange={setDescription}
              placeholder="Add a one-line summary"
              label="Summary"
              className="text-primary-9 mt-2 text-lg"
            />
          ) : log.description ? (
            <p className="text-primary-9 mt-2 text-lg">{log.description}</p>
          ) : null}
          </div>
          <p className="text-neutral-4 border-neutral-2 mt-1 mb-4 border-b pb-4 text-xs">
            {log.created_by?.pref_label ?? 'Unknown author'} · updated{' '}
            {new Date(log.update_date).toLocaleString()}
          </p>

          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : editing ? (
            <>
              {current.map((source, i) => (
                <EditableBlock
                  // biome-ignore lint/suspicious/noArrayIndexKey: blocks have no identity beyond position
                  key={i}
                  source={source}
                  active={active === i}
                  onActivate={() => setActive(i)}
                  onCommit={(draft) => commit(i, draft)}
                  logId={log.id}
                  filesAssetId={filesAssetId}
                />
              ))}
              <div className="mt-4 flex gap-2">
                <Button rounded variant="ghost" size="sm" onClick={() => addBlock('')}>
                  <PlusOutlined /> Text
                </Button>
                <Button rounded variant="ghost" size="sm" onClick={() => setLinkOpen(true)}>
                  <LinkOutlined /> Link entities
                </Button>
              </div>
            </>
          ) : (
            <ResearchLogMarkdown markdown={markdown} logId={log.id} filesAssetId={filesAssetId} />
          )}
        </article>
      </div>

      {linkOpen && <LinkEntitiesWindow onAdd={linkEntities} onClose={() => setLinkOpen(false)} />}
    </div>
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

/** A wrapping single-value field that grows with its text, so it lays out like the heading it edits. */
function GrowingField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className={cn(inlineField, 'block resize-none overflow-hidden', className)}
    />
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
}: {
  source: string;
  active: boolean;
  onActivate: () => void;
  onCommit: (draft: string) => void;
  logId: string;
  filesAssetId?: string;
}) {
  const [draft, setDraft] = useState(source);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (active) setDraft(source);
  }, [active, source]);

  // grow with the text, so the block never scrolls inside itself
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, active]);

  if (active) {
    return (
      <textarea
        ref={area}
        autoFocus
        value={draft}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCommit(draft);
        }}
        onFocus={(e) => e.currentTarget.setSelectionRange(draft.length, draft.length)}
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
      <ResearchLogMarkdown markdown={source} logId={logId} filesAssetId={filesAssetId} />
    </div>
  );
}
