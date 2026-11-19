// The order of the list of logs: a button in the search box, and a small menu to pick the field
// (last updated, date created, name: the ones EntityCore orders research logs by) and the
// direction. EntityCore orders; the browser only says how (order_by).
//
// The menu: one row per field, its icon in a round white chip. The chosen row is lit (a soft
// highlight that slides to it: motion layoutId, shared element transition), its chip turns navy,
// it says the direction in words, and only it carries the direction switch (two arrows). One
// glance answers "sorted by what, which way". Radios underneath, so the keyboard and screen
// readers get two plain radio groups.

import { isNil } from 'es-toolkit';
import { motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';

import { DEFAULT_ORDER, LogOrderField, OrderDirection } from '@/features/logbook/api/research-logs';
import { EASE_OUT, SPRING_LAYOUT } from '@/features/logbook/lib/ease';
import { cn } from '@/features/logbook/lib/utils';
import { Icon } from '@/features/logbook/ui/icons';
import { PopoverAlign, PopoverLayer, useAnchoredPopover } from '@/features/logbook/ui/popover';

import type {
  ILogOrder,
  TLogOrderField,
  TOrderDirection,
} from '@/features/logbook/api/research-logs';
import type { TIconName } from '@/features/logbook/ui/icons';

const WIDTH = 264;

const FIELDS: readonly {
  readonly field: TLogOrderField;
  readonly label: string;
  readonly icon: TIconName;
}[] = [
  { field: LogOrderField.Updated, label: 'Last updated', icon: 'clock' },
  { field: LogOrderField.Created, label: 'Date created', icon: 'calendar' },
  { field: LogOrderField.Name, label: 'Name', icon: 'letters' },
];

const DIRECTIONS: readonly { readonly direction: TOrderDirection; readonly icon: TIconName }[] = [
  { direction: OrderDirection.Ascending, icon: 'arrowUp' },
  { direction: OrderDirection.Descending, icon: 'arrowDown' },
];

// What a direction means for a field, in words: "A to Z" for a name, "Newest first" for a date.
export function directionLabelOf(field: TLogOrderField, direction: TOrderDirection): string {
  const up = direction === OrderDirection.Ascending;
  if (field === LogOrderField.Name) return up ? 'A to Z' : 'Z to A';
  return up ? 'Oldest first' : 'Newest first';
}

const fieldLabelOf = (field: TLogOrderField): string =>
  FIELDS.find((f) => f.field === field)?.label ?? field;

const isDefault = (order: ILogOrder): boolean =>
  order.field === DEFAULT_ORDER.field && order.direction === DEFAULT_ORDER.direction;

// The two arrows of the chosen row: which way it sorts. The lit arrow sits on a white dot.
function DirectionSwitch({
  order,
  name,
  onOrder,
}: {
  readonly order: ILogOrder;
  readonly name: string;
  readonly onOrder: (order: ILogOrder) => void;
}) {
  return (
    <fieldset className="m-0 flex flex-none gap-0.5 rounded-full border-0 bg-white/70 p-0.5 shadow-[inset_0_0_0_1px_rgba(0,39,102,0.08)]">
      <legend className="sr-only">Direction</legend>
      {DIRECTIONS.map(({ direction, icon }) => {
        const on = order.direction === direction;
        return (
          <label
            key={direction}
            className={cn(
              'grid size-6 cursor-pointer place-items-center rounded-full transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-primary-4',
              on
                ? 'bg-primary-9 text-white shadow-block-btn'
                : 'text-neutral-4 hover:text-primary-9'
            )}
            title={directionLabelOf(order.field, direction)}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={on}
              aria-label={directionLabelOf(order.field, direction)}
              onChange={() => onOrder({ ...order, direction })}
            />
            <Icon name={icon} size={12} stroke={2.6} />
          </label>
        );
      })}
    </fieldset>
  );
}

export function OrderButton({
  order,
  onOrder,
}: {
  readonly order: ILogOrder;
  readonly onOrder: (order: ILogOrder) => void;
}) {
  const { at, open, toggle, close } = useAnchoredPopover(WIDTH, PopoverAlign.End);
  const reduce = useReducedMotion();
  // One name per menu for the radio groups and the sliding highlight.
  const id = useId();
  const summary = `${fieldLabelOf(order.field)}, ${directionLabelOf(order.field, order.direction).toLowerCase()}`;
  return (
    <>
      <button
        type="button"
        className="icon-btn relative size-7 hover:bg-white aria-expanded:bg-white aria-expanded:text-primary-9"
        aria-label={`Sort logs: ${summary}`}
        title={`Sorted by ${summary}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        // Lined up with the right edge of the whole search box, not the small button.
        onClick={(event) => toggle(event, event.currentTarget.closest('label'))}
      >
        <Icon name="sort" size={15} stroke={2} />
        {/* Not the usual order: a dot says so, as on a filter that is on. */}
        {isDefault(order) ? null : (
          <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-primary-6 ring-2 ring-neutral-1" />
        )}
      </button>
      {isNil(at) ? null : (
        <PopoverLayer label="Close the sort options" onClose={close}>
          <motion.div
            className="pop fixed z-71 flex max-w-[calc(100vw-16px)] origin-top-right flex-col gap-1 p-2"
            style={{ ...at, width: WIDTH }}
            role="dialog"
            aria-label="Sort logs"
            initial={reduce ? false : { opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
          >
            <div className="flex h-7 items-center justify-between px-2">
              <span className="label-caps">Sort by</span>
              {isDefault(order) ? null : (
                <button
                  type="button"
                  className="rounded-full px-1.5 text-[12px] font-bold text-primary-6 hover:bg-primary-0"
                  onClick={() => onOrder(DEFAULT_ORDER)}
                >
                  Reset
                </button>
              )}
            </div>
            <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
              <legend className="sr-only">Sort by</legend>
              {FIELDS.map(({ field, label, icon }) => {
                const on = order.field === field;
                return (
                  <div key={field} className="relative flex items-center gap-2 rounded-xl pr-1.5">
                    {on ? (
                      <motion.span
                        layoutId={`${id}-lit`}
                        className="absolute inset-0 rounded-xl bg-primary-0"
                        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                      />
                    ) : null}
                    <label
                      className={cn(
                        'relative flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl py-1.5 pl-1.5 has-focus-visible:ring-2 has-focus-visible:ring-primary-4',
                        on ? '' : 'hover:bg-fill-item-hover'
                      )}
                    >
                      <input
                        type="radio"
                        name={`${id}-field`}
                        className="sr-only"
                        checked={on}
                        onChange={() => onOrder({ ...order, field })}
                      />
                      <span
                        className={cn(
                          'grid size-8 flex-none place-items-center rounded-full transition-colors duration-200',
                          on
                            ? 'bg-primary-9 text-white shadow-block-btn'
                            : 'bg-white text-primary-9 shadow-block-btn'
                        )}
                      >
                        <Icon name={icon} size={15} stroke={2} />
                      </span>
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-[13.5px] font-bold text-primary-9">
                          {label}
                        </span>
                        {on ? (
                          <span className="text-[11.5px] text-primary-6" aria-live="polite">
                            {directionLabelOf(field, order.direction)}
                          </span>
                        ) : null}
                      </span>
                    </label>
                    {on ? (
                      <span className="relative">
                        <DirectionSwitch order={order} name={`${id}-direction`} onOrder={onOrder} />
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </fieldset>
          </motion.div>
        </PopoverLayer>
      )}
    </>
  );
}
