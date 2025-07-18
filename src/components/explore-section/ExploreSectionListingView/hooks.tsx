'use client';

import { MouseEvent, ReactNode, useEffect, useState } from 'react';
import { ColumnGroupType, ColumnType } from 'antd/es/table';
import { ConfigProvider, Button } from 'antd';
import { useSetAtom } from 'jotai';

import ChevronLast from '@/components/icons/ChevronLast';
import usePathname from '@/hooks/pathname';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { backToListPathAtom } from '@/state/explore-section/detail-view-atoms';
import { classNames } from '@/util/utils';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { DataType } from '@/constants/explore-section/list-views';

type OnCellClick<T> = (basePath: string, record: T, type: DataType) => void;

export function useOnCellRouteHandler<T extends EntityCoreIdentifiable>({
  dataType,
  onCellClick,
}: {
  dataType: DataType;
  onCellClick?: OnCellClick<T>;
}) {
  const pathname = usePathname();
  const setBackToListPath = useSetAtom(backToListPathAtom);

  const onCellRouteHandler = (col: ColumnGroupType<T> | ColumnType<T>) => {
    return {
      onCell: (record: T) =>
        col.key !== EntityCoreFields.Preview
          ? {
              onClick: (e: MouseEvent<HTMLInputElement>) => {
                e.preventDefault();
                setBackToListPath(pathname);
                onCellClick?.(pathname, record, dataType);
              },
            }
          : {},
    };
  };

  return onCellRouteHandler;
}

export function useShowMore() {
  const [displayLoadMoreBtn, setDisplayLoadMoreBtn] = useState(false);
  const toggleDisplayMore = (value?: boolean) =>
    setDisplayLoadMoreBtn((state) => {
      return value ?? !state;
    });

  return { displayLoadMoreBtn, toggleDisplayMore };
}

function useTheme(children: ReactNode): ReactNode {
  return (
    <ConfigProvider
      theme={{
        components: {
          Button: {
            defaultBg: '#003A8C',
            colorFillContent: '#003A8C',
            colorText: '#fff',
            zIndexPopupBase: 2,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

/**
 * Checks if the content inside the provided HTMLDivElement is horizontally scrollable to the right.
 * Returns true if there is content to the right that is not currently visible, false otherwise.
 * @param {HTMLDivElement} node - The HTMLDivElement to check for rightward scrollability.
 * @returns {boolean} - True if scrollable to the right, false otherwise.
 */
const isRightScrollable = (node: HTMLElement): boolean =>
  (node?.scrollLeft ?? 0) + (node?.offsetWidth ?? 0) < (node?.scrollWidth ?? 0);

/**
 * Checks if the content inside the provided HTMLDivElement is horizontally scrollable to the left.
 * Returns the number of pixels scrolled to the left if scrollable, otherwise returns false.
 * @param {HTMLDivElement} node - The HTMLDivElement to check for leftward scrollability.
 * @returns {number | boolean} - Number of pixels scrolled to the left or false if not scrollable.
 */
const isLeftScrollable = (node: HTMLElement): number | boolean =>
  node?.scrollLeft > 0 ? node.getBoundingClientRect().left : false;

export function useScrollNav(element?: HTMLDivElement): Record<'left' | 'right', ReactNode> {
  const [displayFloatButtons, setDisplayFloatButtons] = useState<{
    right: boolean;
    left: number | boolean;
  }>({
    right: false,
    left: false,
  });

  const updateDisplayControls = (node: HTMLElement) =>
    setDisplayFloatButtons({
      right: isRightScrollable(node),
      left: isLeftScrollable(node),
    });

  const handleScrollToRight = () =>
    element?.scrollTo({
      behavior: 'smooth',
      left: element.scrollWidth,
    });

  const handleScrollToLeft = () =>
    element?.scrollTo({
      behavior: 'smooth',
      left: 0,
    });

  useEffect(() => {
    const container = element as HTMLElement;
    const handleOnScroll = () => updateDisplayControls(container);
    const observer = new ResizeObserver((entries) => {
      updateDisplayControls(entries[0].target as HTMLDivElement);
    });

    if (container) {
      observer.observe(container);
      container.addEventListener('scroll', handleOnScroll);
    }
    return () => {
      if (container) {
        observer.unobserve(container);
        container.removeEventListener('scroll', handleOnScroll);
      }
    };
  }, [element]);

  const right = useTheme(
    <Button
      className={classNames(
        'bg-primary-8 flex items-center justify-center',
        !displayFloatButtons.right && 'collapse'
      )}
      onClick={handleScrollToRight}
      icon={<ChevronLast className="text-white!" />}
      disabled={!displayFloatButtons.right}
      shape="circle"
      size="large"
    />
  );

  const left = useTheme(
    <Button
      className={classNames(
        'bg-primary-8 flex items-center justify-center',
        !displayFloatButtons.left && 'collapse'
      )}
      onClick={handleScrollToLeft}
      icon={<ChevronLast className="rotate-180 transform text-white!" />}
      disabled={!displayFloatButtons.left}
      shape="circle"
      size="large"
    />
  );

  return {
    left,
    right,
  };
}
