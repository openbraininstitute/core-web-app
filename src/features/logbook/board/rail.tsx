import { isNil, uniqBy } from 'es-toolkit';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { match } from 'ts-pattern';

import { ActorVia } from '@/api/logbook/types';
import { useContributors } from '@/features/logbook/api/contributors';
import { colourOf } from '@/features/logbook/blocks/colour';
import { OrderButton } from '@/features/logbook/board/log-order';
import { PillSkeletons } from '@/features/logbook/elements/skeletons';
import { agoOf, dateOf, POPOVER_PANEL } from '@/features/logbook/helpers';
import { DeleteLogDialog } from '@/features/logbook/log/delete-log-dialog';
import { NotifyPopover } from '@/features/logbook/log/menus';
import { useNotifySettings } from '@/features/logbook/log/notify-settings';
import { PopoverAlign, PopoverSide, RailHeading } from '@/features/logbook/types';
import { Icon } from '@/ui/molecules/icon';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { AvatarGroup } from '@/ui/segments/avatar-group';
import { cn } from '@/utils/css-class';

import type { ReactNode, RefObject } from 'react';
import type { IResearchLog } from '@/api/entitycore/types/entities/research-log';
import type { IContributor } from '@/api/logbook/types';
import type {
  IMore,
  IProject,
  IRailProps,
  IScope,
  TPopoverAlign,
  TPopoverSide,
} from '@/features/logbook/types';
import type { IAvatarGroupMember } from '@/ui/segments/avatar-group';

const SCOPE_BUTTON =
  'grid size-8 place-items-center rounded-full border-0 bg-transparent text-label transition-[background-color,color] duration-150 ease-[ease] hover:bg-white';
const LIST_EMPTY = 'px-3 text-[14px] text-neutral-4';

export const membersOf = (
  log: IResearchLog,
  contributors: readonly IContributor[]
): IAvatarGroupMember[] => {
  const sub = log.created_by.id;
  const creator: IAvatarGroupMember = {
    id: `creator:${log.id}`,
    name: log.created_by.pref_label,
    colour: colourOf(sub),
  };
  const writers = contributors
    .filter((c) => !(c.userId === sub && c.via !== ActorVia.Agent))
    .map((c) => ({
      id: String(c.actorId),
      name: c.label,
      colour: colourOf(c.userId),
      agent: c.via === ActorVia.Agent,
    }));
  return uniqBy([creator, ...writers], (member) => member.name);
};

export function LogWriters({
  project,
  log,
}: {
  readonly project: IProject;
  readonly log: IResearchLog;
}) {
  const { ref: box, inView: shown } = useInView({
    rootMargin: '200px',
    triggerOnce: true,
    fallbackInView: true,
  });
  const writers = useContributors(project, log.id, shown);
  return (
    <span ref={box} className="pointer-events-auto">
      <AvatarGroup
        members={membersOf(log, writers.data ?? [])}
        max={3}
        size="sm"
        label={`Writers of ${log.name}`}
        labels={{
          showMore: (count) => `Show ${count} more writers`,
          showFewer: 'Show fewer writers',
        }}
      />
    </span>
  );
}

export function LoadMore({
  more,
  skeleton,
}: {
  readonly more: IMore;
  readonly skeleton: ReactNode;
}) {
  const { ref: end, inView: near } = useInView({ rootMargin: '400px', fallbackInView: true });
  const { has, loading, failed, onMore } = more;
  useEffect(() => {
    if (near && has && !loading && !failed) onMore();
  }, [near, has, loading, failed, onMore]);
  return (
    <>
      {has && loading ? skeleton : null}
      <div ref={end} className="col-span-full flex justify-center">
        {has && failed ? (
          <button
            type="button"
            className="h-8 rounded-full bg-fill-2 px-3 text-[13px] font-bold text-primary-9"
            onClick={onMore}
          >
            More logs did not load. Try again
          </button>
        ) : (
          <span className="sr-only" aria-live="polite">
            {loading ? 'Loading more logs' : ''}
          </span>
        )}
      </div>
    </>
  );
}

export function ScopeFilter({
  scope,
  onScope,
}: {
  readonly scope: IScope;
  readonly onScope: (scope: IScope) => void;
}) {
  return (
    <div className="flex h-10 items-center gap-1 rounded-full bg-neutral-1 px-1.5">
      <button
        type="button"
        className={cn(
          SCOPE_BUTTON,
          'data-[on=true]:bg-scope-public-bg data-[on=true]:text-scope-public-fg'
        )}
        data-on={scope.public}
        aria-pressed={scope.public}
        aria-label="Public logs"
        title="Public logs"
        onClick={() => onScope({ ...scope, public: !scope.public })}
      >
        <Icon name="globe" size={18} stroke={1.8} />
      </button>
      <button
        type="button"
        className={cn(SCOPE_BUTTON, 'data-[on=true]:bg-primary-1 data-[on=true]:text-primary-7')}
        data-on={scope.project}
        aria-pressed={scope.project}
        aria-label="This project's logs"
        title="This project's logs"
        onClick={() => onScope({ ...scope, project: !scope.project })}
      >
        <Icon name="people" size={18} stroke={1.8} />
      </button>
    </div>
  );
}

export function NewButton({
  creating,
  onNew,
}: {
  readonly creating: boolean;
  readonly onNew: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-10 flex-none items-center justify-center gap-2 rounded-full border border-white/20 bg-green-main px-4 text-[14px] font-bold text-white transition-[width,padding] duration-150 disabled:cursor-progress disabled:opacity-70 @max-[280px]/rail:w-10 @max-[280px]/rail:px-0"
      title="New research log"
      disabled={creating}
      onClick={onNew}
    >
      <span className="@max-[280px]/rail:sr-only">New</span>
      <Icon name="plus" size={14} stroke={2.4} />
    </button>
  );
}

export function SettingsButton({
  align = PopoverAlign.Start,
  side = PopoverSide.Below,
  className = 'icon-btn size-10 flex-none aria-expanded:bg-fill-2',
  iconSize = 18,
  anchor,
  onOpenChange,
}: {
  readonly align?: TPopoverAlign;
  readonly side?: TPopoverSide;
  readonly className?: string;
  readonly iconSize?: number;
  readonly anchor?: RefObject<Element | null>;
  readonly onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [settings, update] = useNotifySettings();
  useEffect(() => onOpenChange?.(open), [open, onOpenChange]);
  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      {isNil(anchor) ? null : <PopoverAnchor virtualRef={anchor as RefObject<Element>} />}
      <PopoverTrigger asChild>
        <button
          type="button"
          className={className}
          aria-label="Notification settings"
          title="Notification settings"
        >
          <Icon name="bell" size={iconSize} stroke={1.8} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        sideOffset={8}
        collisionPadding={8}
        className={cn(POPOVER_PANEL, 'z-71 p-0')}
        aria-label="Notification settings"
      >
        <NotifyPopover settings={settings} onChange={update} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

export function SearchField({
  value,
  onSearch,
  label = 'Search logs',
  placeholder = 'Search logs...',
  className,
  children,
}: {
  readonly value: string;
  readonly onSearch: (search: string) => void;
  readonly label?: string;
  readonly placeholder?: string;
  readonly className?: string;
  readonly children?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const clear = (): void => {
    onSearch('');
    input.current?.focus();
  };
  return (
    <label
      className={cn(
        'flex h-10 flex-none items-center gap-2 rounded-full bg-neutral-1 pr-1.5 pl-4 text-neutral-4 focus-within:ring-2 focus-within:ring-primary-4',
        className
      )}
    >
      <Icon name="search" size={16} />
      <span className="sr-only">{label}</span>
      <input
        ref={input}
        className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-primary-9 outline-none"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value.length > 0) {
            event.preventDefault();
            onSearch('');
          }
        }}
      />
      {value.length > 0 ? (
        <button
          type="button"
          className="icon-btn size-7 hover:bg-white"
          aria-label="Clear the search"
          title="Clear"
          onClick={clear}
        >
          <Icon name="close" size={12} stroke={2.4} />
        </button>
      ) : null}
      {children}
    </label>
  );
}

export function LogsEmpty({
  query,
  scope,
  compact = false,
}: {
  readonly query: string;
  readonly scope: IScope;
  readonly compact?: boolean;
}) {
  const needle = query.trim();
  const { icon, title, text } =
    !scope.public && !scope.project
      ? {
          icon: 'globe' as const,
          title: 'Both filters are off',
          text: 'Turn on Public, this project, or both, to list logs.',
        }
      : needle.length > 0
        ? {
            icon: 'search' as const,
            title: 'No log matches',
            text: `Nothing for “${needle}”. Try other words, or turn on both filters.`,
          }
        : {
            icon: 'notebook' as const,
            title: 'No logs here',
            text: match(scope)
              .with(
                { public: true, project: false },
                () => 'No public logs. Turn on this project’s logs to see the others.'
              )
              .with(
                { public: false, project: true },
                () => 'No logs in this project. Turn on Public to see public logs.'
              )
              .otherwise(() => 'Nobody has written a log yet.'),
          };
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 text-center',
        compact ? 'px-4 py-10' : 'flex-1 justify-center gap-3 px-6 py-12'
      )}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-soft text-neutral-4">
        <Icon name={icon} size={22} />
      </span>
      <strong className={compact ? 'text-[15px]' : 'text-[17px]'}>{title}</strong>
      <p
        className={cn(
          'text-neutral-4',
          compact ? 'max-w-[260px] text-[13px] leading-normal' : 'max-w-[380px] text-[14px]'
        )}
      >
        {text}
      </p>
    </div>
  );
}

const MENU_ITEM =
  'flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[14px] font-semibold text-primary-9 transition-colors hover:bg-fill-item-hover';

export function CardMenu({
  name,
  deleteLabel = 'Delete',
  onRename,
  onDelete,
  onClose,
}: {
  readonly name: string;
  readonly deleteLabel?: string;
  readonly onRename: () => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-30 cursor-default border-0 bg-transparent"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className="pop absolute top-10 right-2 z-31 flex w-[168px] flex-col p-1.5"
        role="menu"
        aria-label={`Actions for ${name}`}
        onKeyDown={(event) => event.key === 'Escape' && onClose()}
      >
        {/* biome-ignore lint/a11y/noAutofocus: the menu or field this click opened takes focus */}
        <button type="button" role="menuitem" className={MENU_ITEM} autoFocus onClick={onRename}>
          <Icon name="pencil" size={15} />
          Rename
        </button>
        <button
          type="button"
          role="menuitem"
          className={cn(MENU_ITEM, 'text-destructive hover:bg-destructive/10')}
          onClick={onDelete}
        >
          <Icon name="trash" size={15} />
          {deleteLabel}
        </button>
      </div>
    </>
  );
}

export function RenameField({
  name,
  label = 'Name of the log',
  placeholder,
  className,
  onSave,
  onCancel,
}: {
  readonly name: string;
  readonly label?: string;
  readonly placeholder?: string;
  readonly className?: string;
  readonly onSave: (name: string) => void;
  readonly onCancel: () => void;
}) {
  const [value, setValue] = useState(name);
  // Once only: removing a focused field can fire one more blur.
  const done = useRef(false);
  const finish = (end: () => void): void => {
    if (done.current) return;
    done.current = true;
    end();
  };
  const save = (): void => {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed === name) onCancel();
    else onSave(trimmed);
  };
  return (
    <input
      className={cn(
        'pointer-events-auto relative z-1 w-full min-w-0 rounded-[8px] border border-primary-4 bg-white px-2 py-1 text-[15px] font-bold text-primary-9 outline-none',
        className
      )}
      aria-label={label}
      placeholder={placeholder}
      value={value}
      maxLength={300}
      // biome-ignore lint/a11y/noAutofocus: the menu or field this click opened takes focus
      autoFocus
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(save)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') finish(onCancel);
      }}
    />
  );
}

export function Rail(props: IRailProps) {
  const { logs: shown, scope, activeId } = props;
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ readonly id: string; readonly text: string } | null>(null);
  const run = (id: string, write: Promise<unknown>): void => {
    setFailed(null);
    write.catch((error: unknown) =>
      setFailed({ id, text: error instanceof Error ? error.message : 'It did not work.' })
    );
  };
  const rename = (id: string, name: string): void => {
    setRenaming(null);
    run(id, props.onRename(id, name));
  };
  const [deleting, setDeleting] = useState<IResearchLog | null>(null);
  const remove = (log: IResearchLog): void => {
    setMenuFor(null);
    setDeleting(log);
  };
  return (
    <>
      {props.heading === RailHeading.None ? null : (
        <div className="flex items-center justify-between p-[4px_4px_0_8px]">
          <h2 className="text-[20px] font-bold">Research logs</h2>
          {props.heading === RailHeading.Drawer ? (
            <button
              type="button"
              className="icon-btn size-10"
              aria-label="Close the list of logs"
              onClick={props.onClose}
            >
              <Icon name="close" size={14} stroke={2.4} />
            </button>
          ) : null}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <ScopeFilter scope={scope} onScope={props.onScope} />
        <div className="flex items-center gap-1">
          <SettingsButton />
          <NewButton creating={props.creating} onNew={props.onNew} />
        </div>
      </div>
      <SearchField value={props.search} onSearch={props.onSearch}>
        <OrderButton order={props.order} onOrder={props.onOrder} />
      </SearchField>
      <nav
        className="scroll-thin -mr-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-4 pb-2 [scrollbar-gutter:stable]"
        aria-label="Research logs"
        aria-busy={props.loading || props.more.loading}
      >
        {props.error ? <p className={LIST_EMPTY}>{props.error}</p> : null}
        {props.loading ? <PillSkeletons count={6} /> : null}
        {!props.loading && !props.error && shown.length === 0 ? (
          <LogsEmpty query={props.search} scope={scope} compact />
        ) : null}
        {shown.map((log) => (
          <Fragment key={log.id}>
            <div
              className="group relative rounded-[12px] bg-neutral-1 transition-[background-color] duration-150 ease-[ease] hover:bg-fill-pill-hover data-[on=true]:bg-primary-9"
              data-on={log.id === activeId}
            >
              <button
                type="button"
                className="absolute inset-0 rounded-[12px] border-0 bg-transparent"
                aria-current={log.id === activeId ? 'page' : undefined}
                aria-label={log.name}
                onClick={() => props.onPick(log.id)}
              />
              <div className="pointer-events-none relative flex flex-col gap-1 p-[12px_14px_12px_16px]">
                <span className="flex items-center gap-1.5 pr-[30px]">
                  {renaming === log.id ? (
                    <RenameField
                      name={log.name}
                      onSave={(name) => rename(log.id, name)}
                      onCancel={() => setRenaming(null)}
                    />
                  ) : (
                    <span className="min-w-0 truncate text-[15px] font-bold text-primary-9 group-data-[on=true]:text-white">
                      {log.name}
                    </span>
                  )}
                  {log.authorized_public ? (
                    <span
                      className="grid size-[18px] flex-none place-items-center rounded-[6px] bg-scope-public-bg text-scope-public-fg"
                      title="Public"
                    >
                      <Icon name="globe" size={12} stroke={2} />
                    </span>
                  ) : null}
                </span>
                {failed?.id === log.id ? (
                  <span className="text-[12px] font-semibold text-destructive" role="alert">
                    {failed.text}
                  </span>
                ) : null}
                {log.description.trim().length > 0 ? (
                  <span className="line-clamp-2 text-[13px] leading-[18px] text-neutral-10 group-data-[on=true]:text-white group-data-[on=true]:opacity-85">
                    {log.description}
                  </span>
                ) : null}
                <span
                  className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-neutral-4 group-data-[on=true]:text-white"
                  title={`Created ${dateOf(log.creation_date)} by ${log.created_by.pref_label}. Updated ${dateOf(log.update_date)}.`}
                >
                  <LogWriters project={props.project} log={log} />
                  <span className="ml-auto flex-none">{agoOf(log.update_date)}</span>
                </span>
              </div>
              <button
                type="button"
                className="absolute top-2 right-2 grid size-7 place-items-center rounded-[8px] border-0 bg-transparent text-neutral-4 opacity-0 transition-opacity duration-150 ease-[ease] group-focus-within:opacity-100 group-hover:opacity-100 data-[open=true]:opacity-100 group-data-[on=true]:bg-white/14 group-data-[on=true]:text-white"
                aria-label={`Actions for ${log.name}`}
                aria-haspopup="menu"
                aria-expanded={menuFor === log.id}
                data-open={menuFor === log.id}
                onClick={() => setMenuFor(menuFor === log.id ? null : log.id)}
              >
                <Icon name="dots" size={16} stroke={2.4} />
              </button>
              {menuFor === log.id ? (
                <CardMenu
                  name={log.name}
                  onRename={() => {
                    setMenuFor(null);
                    setRenaming(log.id);
                  }}
                  onDelete={() => remove(log)}
                  onClose={() => setMenuFor(null)}
                />
              ) : null}
            </div>
            {log.id === activeId ? props.outline : null}
          </Fragment>
        ))}
        <LoadMore more={props.more} skeleton={<PillSkeletons count={2} />} />
      </nav>
      {isNil(deleting) ? null : (
        <DeleteLogDialog
          log={deleting}
          project={props.project}
          onDelete={() => props.onDelete(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
