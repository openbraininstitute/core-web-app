// The popovers of an open log: Insert, the entity picker and the
// notification settings. Every insert lands after the block the caret is in.
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { isNil } from 'es-toolkit';
import { useDeferredValue, useRef, useState } from 'react';

import { entitySearchQuery } from '@/features/logbook/api/entities';
import { UPLOAD_ACCEPT } from '@/features/logbook/api/log-files';
import { EntityType, entityLookOf, entityLooks } from '@/features/logbook/blocks/kinds';
import { insertAfterBlock } from '@/features/logbook/editor/insert';
import { cn } from '@/features/logbook/lib/utils';
import { useLogContext } from '@/features/logbook/log/context';
import { ToastSource } from '@/features/logbook/log/notify-settings';
import { uploadFiles } from '@/features/logbook/log/uploads';
import { Icon } from '@/features/logbook/ui/icons';

import type { Editor } from '@tiptap/react';
import type { CSSProperties } from 'react';
import type { TEntityType } from '@/features/logbook/blocks/kinds';
import type { IPopAt } from '@/features/logbook/log/EditorCard';
import type { INotifySettings, TToastSource } from '@/features/logbook/log/notify-settings';
import type { TIconName } from '@/features/logbook/ui/icons';

// Class lists the popovers repeat.
const ITEM = 'rounded-[10px] text-left text-primary-9 transition-colors hover:bg-fill-item-hover';
const MENU_ITEM = `${ITEM} flex items-center gap-2.5 px-2.5 py-2`;
const MENU = 'pop absolute z-41 flex max-w-[calc(100%-16px)] flex-col p-1.5';
const LABEL = 'px-2.5 pb-1 text-[11px] font-bold tracking-[0.06em] text-neutral-4 uppercase';
const TILE = 'grid size-[30px] flex-none place-items-center rounded-[9px] text-[10px]';
const TEXT = 'flex min-w-0 flex-1 flex-col';
const TITLE = 'truncate text-[14px] font-semibold';
const SUB = 'text-[12px] text-neutral-4';
const NOTE = 'mx-2.5 my-2 text-[13px] leading-normal text-neutral-4';
const HEAD = 'flex items-center justify-between';

export interface IInsertMenuProps {
  readonly editor: Editor;
  readonly at: IPopAt;
  readonly onClose: () => void;
  readonly onPicker: () => void;
  readonly onNotice: (text: string) => void;
}

export function InsertMenu({ editor, at, onClose, onPicker, onNotice }: IInsertMenuProps) {
  const { project, logId } = useLogContext();
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  // The upload outlives the menu (it closes at once); uploads.ts owns it from here.
  const upload = (list: FileList | null): void => {
    onClose();
    void uploadFiles({ editor, logId, project, client, notify: onNotice }, list);
  };
  return (
    <div
      className={`${MENU} w-[292px]`}
      role="menu"
      aria-label="Insert"
      style={{ top: at.top, left: at.left }}
    >
      <div className={`${LABEL} pt-2`}>From the platform</div>
      <button type="button" role="menuitem" className={MENU_ITEM} onClick={onPicker}>
        <span className={`${TILE} bg-blue-tint text-blue`}>
          <Icon name="link" size={16} />
        </span>
        <span className={TEXT}>
          <span className={TITLE}>Link entities</span>
          <span className={SUB}>Circuit, morphology, model, result and more</span>
        </span>
      </button>
      <div className={`${LABEL} pt-2.5`}>From your computer</div>
      <input
        ref={input}
        type="file"
        accept={UPLOAD_ACCEPT}
        multiple
        hidden
        onChange={(event) => upload(event.target.files)}
      />
      <button
        type="button"
        role="menuitem"
        className={MENU_ITEM}
        onClick={() => input.current?.click()}
      >
        <span className={`${TILE} bg-scope-public-bg text-scope-public-fg`}>
          <Icon name="upload" size={16} />
        </span>
        <span className={TEXT}>
          <span className={TITLE}>Upload a file</span>
          <span className={SUB}>Picture, data, notebook, PDF, model, archive</span>
        </span>
      </button>
    </div>
  );
}

const PICKER_TYPES: readonly TEntityType[] = [
  EntityType.Circuit,
  EntityType.Morphology,
  EntityType.Emodel,
  EntityType.Simulation,
  EntityType.IonChannelModel,
  EntityType.Trace,
];

export function EntityPicker({
  editor,
  onClose,
}: {
  readonly editor: Editor;
  readonly onClose: () => void;
}) {
  const { project } = useLogContext();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TEntityType | null>(null);
  const query = useDeferredValue(search);
  const types = isNil(type) ? PICKER_TYPES : [type];
  const results = useQueries({
    queries: types.map((t) => entitySearchQuery(t, query, project)),
    combine: (all) => ({
      pending: all.some((r) => r.isPending),
      entities: all.flatMap((r) => r.data ?? []),
    }),
  });
  return (
    <div
      className="pop absolute top-16 left-1/2 z-41 flex max-h-[calc(100%-96px)] w-[min(580px,calc(100%-32px))] -translate-x-1/2 flex-col overflow-hidden"
      role="dialog"
      aria-label="Link an entity"
    >
      <div className={`${HEAD} px-[18px] pt-4 pb-2.5 text-[16px]`}>
        <strong>Link an entity</strong>
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
          <Icon name="close" size={14} stroke={2.4} />
        </button>
      </div>
      <label className="mx-[18px] flex h-10 flex-none items-center gap-2 rounded-full bg-neutral-1 px-4 text-neutral-4">
        <Icon name="search" size={16} />
        <span className="sr-only">Search entities</span>
        <input
          // biome-ignore lint/a11y/noAutofocus: the menu or field this click opened takes focus
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-[14px] text-primary-9 outline-none"
          value={search}
          placeholder="Search this project's entities..."
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-1.5 px-[18px] pt-3 pb-2">
        <button
          type="button"
          className="h-7 rounded-full bg-fill-2 px-3 text-[12px] font-semibold text-primary-9 aria-pressed:bg-primary-9 aria-pressed:text-white"
          aria-pressed={isNil(type)}
          onClick={() => setType(null)}
        >
          All
        </button>
        {PICKER_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className="h-7 rounded-full bg-fill-2 px-3 text-[12px] font-semibold text-primary-9 aria-pressed:bg-primary-9 aria-pressed:text-white"
            aria-pressed={type === t}
            onClick={() => setType(t)}
          >
            {entityLooks[t].label}
          </button>
        ))}
      </div>
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pt-1 pb-2">
        {results.entities.map((entity) => {
          const look = entityLookOf(entity.type);
          return (
            <button
              key={`${entity.type}:${entity.id}`}
              type="button"
              className={`${ITEM} flex items-center gap-3 rounded-[12px] px-2.5 py-2`}
              onClick={() => {
                insertAfterBlock(editor, {
                  type: 'entity',
                  attrs: { label: entity.name, type: entity.type, entityId: entity.id },
                });
                onClose();
              }}
            >
              <span
                className="grid size-9 flex-none place-items-center rounded-[10px]"
                style={{ background: look.tint, color: look.colour }}
              >
                <Icon name={entity.type} size={18} stroke={1.8} />
              </span>
              <span className={TEXT}>
                <span className={TITLE}>{entity.name}</span>
                <span className={SUB}>
                  {[entity.brain_region?.name, entity.created_by?.pref_label]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span
                className="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-bold tracking-[0.04em] whitespace-nowrap uppercase"
                style={{ background: look.tint, color: look.colour }}
              >
                {look.label}
              </span>
            </button>
          );
        })}
        {results.pending ? <p className={NOTE}>Searching…</p> : null}
        {!results.pending && results.entities.length === 0 ? (
          <p className={NOTE}>No entity matches.</p>
        ) : null}
      </div>
      <div className="border-t border-rule-soft px-[18px] pt-2.5 pb-3.5 text-[12px] text-neutral-4">
        Each type gets its own card in the log. A type without one yet uses the generic card.
      </div>
    </div>
  );
}

export interface INotifyPopoverProps {
  // Where it shows: under the list's settings button, or at the top right of an open log.
  readonly className: string;
  readonly style?: CSSProperties;
  readonly settings: INotifySettings;
  readonly onChange: (patch: Partial<INotifySettings>) => void;
  readonly onClose: () => void;
}

// One setting: the whole row is the label, so it highlights and toggles anywhere on it.
function Switch({
  title,
  sub,
  checked,
  onChange,
}: {
  readonly title: string;
  readonly sub: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <label className="-mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-fill-item-hover">
      <span className={TEXT}>
        <span className={TITLE}>{title}</span>
        <span className={SUB}>{sub}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        className="relative m-0 h-5 w-9 flex-none cursor-pointer appearance-none rounded-full bg-neutral-2 transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.25)] after:transition-transform checked:bg-blue checked:after:translate-x-4"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

// Whose agents send messages: two option cards (a radio group), each saying what it means.
const SOURCES: readonly {
  readonly source: TToastSource;
  readonly icon: TIconName;
  readonly title: string;
  readonly sub: string;
}[] = [
  {
    source: ToastSource.All,
    icon: 'people',
    title: 'Every agent',
    sub: 'Anyone’s agent writing in this log',
  },
  { source: ToastSource.Mine, icon: 'person', title: 'Just mine', sub: 'Agents working as you' },
];

function SourceChoice({
  from,
  disabled,
  onChange,
}: {
  readonly from: TToastSource;
  readonly disabled: boolean;
  readonly onChange: (from: TToastSource) => void;
}) {
  return (
    <fieldset
      className="m-0 grid grid-cols-2 gap-2 border-0 p-0 transition-opacity disabled:opacity-45"
      disabled={disabled}
    >
      <legend className="sr-only">Messages from</legend>
      {SOURCES.map(({ source, icon, title, sub }) => (
        <label
          key={source}
          className={cn(
            'group relative flex flex-col gap-1.5 rounded-xl border border-block-border p-2.5 transition-[background-color,border-color] has-checked:border-primary-4 has-checked:bg-primary-0 has-focus-visible:outline-2 has-focus-visible:outline-primary-4',
            disabled ? 'cursor-default' : 'cursor-pointer hover:bg-fill-item-hover'
          )}
        >
          <input
            type="radio"
            name="toast-source"
            className="sr-only"
            checked={from === source}
            onChange={() => onChange(source)}
          />
          <span className="flex items-center justify-between">
            <span className="relative grid size-7 place-items-center rounded-lg bg-white text-primary-9 shadow-block-btn">
              <Icon name={icon} size={15} />
              <span className="absolute -top-1 -right-1 grid size-3.5 place-items-center rounded-full bg-white text-primary-6 shadow-[0_0_0_1px_currentColor]">
                <Icon name="sparkle" size={9} stroke={2.6} />
              </span>
            </span>
            <span className="grid size-4 place-items-center rounded-full border border-neutral-2 bg-white text-white group-has-checked:border-primary-6 group-has-checked:bg-primary-6">
              <Icon name="check" size={10} stroke={3} />
            </span>
          </span>
          <span className="text-[13px] leading-tight font-bold text-primary-9">{title}</span>
          <span className="text-[11.5px] leading-snug text-neutral-4">{sub}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function NotifyPopover({
  className,
  style,
  settings,
  onChange,
  onClose,
}: INotifyPopoverProps) {
  return (
    <div
      className={cn(
        'pop z-41 flex w-[340px] max-w-[calc(100vw-16px)] flex-col gap-3.5 p-[18px]',
        className
      )}
      style={style}
      role="dialog"
      aria-label="Notification settings"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div className={HEAD}>
        <strong className="text-[15px]">Notifications</strong>
        <button
          type="button"
          className="modal-close"
          aria-label="Close notification settings"
          onClick={onClose}
        >
          <Icon name="close" size={14} stroke={2.4} />
        </button>
      </div>
      <Switch
        title="Agent messages"
        sub="A short note at the bottom when an agent changes the text."
        checked={settings.toasts}
        onChange={(toasts) => onChange({ toasts })}
      />
      <SourceChoice
        from={settings.from}
        disabled={!settings.toasts}
        onChange={(from) => onChange({ from })}
      />
      <Switch
        title="Highlight new text"
        sub="Tint text others just added, fading after a few seconds."
        checked={settings.highlights}
        onChange={(highlights) => onChange({ highlights })}
      />
      <Switch
        title="Names on cursors"
        sub="Show a name over a cursor while that person or agent types."
        checked={settings.flags}
        onChange={(flags) => onChange({ flags })}
      />
    </div>
  );
}
