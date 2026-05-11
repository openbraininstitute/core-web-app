import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import type { TScanConfigTabs } from '@/features/scan-config/types';

export const getRoundedByIndex = (
  index: number,
  length: number
): 'rounded-full' | 'rounded-l-full' | 'rounded-r-full' | 'rounded-none' => {
  if (length === 1) return 'rounded-full';
  if (index === 0) return 'rounded-l-full';
  if (index === length - 1) return 'rounded-r-full';
  return 'rounded-none';
};

export function Tab({
  tab,
  selectedTab,
  children,
  onClick,
  rounded = 'rounded-full',
  extraClass,
  disabled,
}: {
  tab: string;
  selectedTab: TScanConfigTabs;
  onClick?: () => void;
  rounded?: 'rounded-l-full' | 'rounded-r-full' | 'rounded-full' | 'rounded-none';
  children?: React.ReactNode;
  extraClass?: string;
  disabled?: boolean;
}) {
  return (
    <button
      id={`tab-${tab}`}
      aria-label={tab}
      disabled={disabled}
      aria-disabled={disabled}
      onClick={!disabled ? onClick : undefined}
      type="button"
      className={cn(
        'min-w-37.5 px-5 py-2',
        extraClass,
        rounded,
        { 'bg-gray-100 cursor-not-allowed text-gray-600': disabled },
        {
          'bg-linear-to-r from-[#003A8C] to-[#001026] text-white rounded-l-none':
            tab === selectedTab.id,
        },
        { "'text-primary-8 bg-white'": tab !== selectedTab.id }
      )}
    >
      {children}
    </button>
  );
}

export function LeftMenuTab({
  tab,
  selectedTab,
  children,
  onClick,
  rounded = 'rounded-full',
  extraClass,
  disabled,
  style,
}: {
  tab: string;
  selectedTab: string;
  onClick?: () => void;
  rounded?: 'rounded-l-full' | 'rounded-r-full' | 'rounded-full';
  children?: React.ReactNode;
  extraClass?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const isSelected = tab === selectedTab;
  return (
    <button
      data-scan-config-menu="left-menu-top-item"
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
