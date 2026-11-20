// Every insert lands after the block the caret is in.
import { useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { UPLOAD_ACCEPT } from '@/features/logbook/api/log-files';
import { useLogContext } from '@/features/logbook/log/context';
import { ToastSource } from '@/features/logbook/log/notify-settings';
import { uploadFiles } from '@/features/logbook/log/uploads';
import { Icon } from '@/features/logbook/ui/icons';
import { cn } from '@/utils/css-class';

import type { Editor } from '@tiptap/react';
import type { CSSProperties } from 'react';
import type { IPopAt } from '@/features/logbook/log/editor-card';
import type { INotice } from '@/features/logbook/log/notice';
import type { INotifySettings, TToastSource } from '@/features/logbook/log/notify-settings';
import type { TIconName } from '@/features/logbook/ui/icons';

const ITEM = 'rounded-[10px] text-left text-primary-9 transition-colors hover:bg-fill-item-hover';
const MENU_ITEM = `${ITEM} flex items-center gap-2.5 px-2.5 py-2`;
const MENU = 'pop absolute z-41 flex max-w-[calc(100%-16px)] flex-col p-1.5';
const LABEL = 'px-2.5 pb-1 text-[11px] font-bold tracking-[0.06em] text-neutral-4 uppercase';
const TILE = 'grid size-[30px] flex-none place-items-center rounded-[9px] text-[10px]';
const TEXT = 'flex min-w-0 flex-1 flex-col';
const TITLE = 'truncate text-[14px] font-semibold';
const SUB = 'text-[12px] text-neutral-4';
const HEAD = 'flex items-center justify-between';

export interface IInsertMenuProps {
  readonly editor: Editor;
  readonly at: IPopAt;
  readonly onClose: () => void;
  readonly onPicker: () => void;
  readonly onNotice: (notice: INotice) => void;
}

export function InsertMenu({ editor, at, onClose, onPicker, onNotice }: IInsertMenuProps) {
  const { project, logId } = useLogContext();
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  // The upload outlives the menu, which closes at once.
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

export interface INotifyPopoverProps {
  readonly className: string;
  readonly style?: CSSProperties;
  readonly settings: INotifySettings;
  readonly onChange: (patch: Partial<INotifySettings>) => void;
  readonly onClose: () => void;
}

// The whole row is the label, so it toggles anywhere on it.
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
