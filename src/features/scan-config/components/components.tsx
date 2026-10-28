import { classNames } from '@/util/utils';

export function LeftMenuTab({
  tab,
  selectedTab,
  children,
  onClick,
  rounded = 'rounded-full',
  extraClass,
  disabled,
  style,
  testId,
}: {
  tab: string;
  selectedTab: string;
  onClick?: () => void;
  rounded?: 'rounded-l-full' | 'rounded-r-full' | 'rounded-full';
  children?: React.ReactNode;
  extraClass?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  /** E2E handle. Titles come from a live schema and are restyled by CSS, so a
   * test cannot address these tabs by their visible text. */
  testId?: string;
}) {
  const isSelected = tab === selectedTab;
  return (
    <button
      data-scan-config-menu="left-menu-top-item"
      data-testid={testId}
      data-active={isSelected}
      onClick={!disabled ? onClick : undefined}
      type="button"
      style={disabled ? { background: '#d1d5db', cursor: 'default', color: '#9ca3af' } : style}
      className={classNames(
        'min-w-37.5 px-5',
        extraClass,
        rounded,
        isSelected
          ? 'bg-linear-to-r from-[#003A8C] to-[#001026] text-white mb-1'
          : 'text-primary-8 bg-white'
      )}
    >
      {children}
    </button>
  );
}

/** Small numeric pill shown next to a tab label, e.g. how many entries/parameters it holds. */
export function CountBadge({
  count,
  selected,
  testId,
}: {
  count: number;
  selected?: boolean;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={classNames(
        // 1em box: the same height as the status mark beside it
        'inline-flex h-[1em] min-w-[1em] shrink-0 items-center justify-center rounded-full px-[0.2em]',
        selected ? 'bg-white text-primary-8' : 'bg-primary-8 text-white'
      )}
    >
      <span className="text-[0.7em] leading-none font-semibold tabular-nums">{count}</span>
    </span>
  );
}

export function Chevron({ rotate }: { rotate?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={rotate !== undefined ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      <title>Chevron</title>
      <path
        d="M6 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
