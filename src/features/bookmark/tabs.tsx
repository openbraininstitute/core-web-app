import { LoadingOutlined } from '@ant-design/icons';
import Link, { useLinkStatus } from 'next/link';

import kebabCase from 'es-toolkit/compat/kebabCase';
import isEmpty from 'es-toolkit/compat/isEmpty';
import pickBy from 'es-toolkit/compat/pickBy';
import isNil from 'es-toolkit/compat/isNil';
import get from 'es-toolkit/compat/get';

import useHorizontalScrollInfo from '@/hooks/useHorizontalScrollInfo';
import { DotsHorizontal } from '@/components/icons/EditorIcons';
import { classNames } from '@/util/utils';

import type { TEntityTypeGroup } from '@/entity-configuration/domain/group';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';

type EntityTypeTabsProps = {
  items: Array<{
    key: EntitySlugValue | undefined;
    label: string;
  }>;
  activeSlug: string;
  basePath: string;
  category: string;
};

type DataTypeTabsProps = {
  items: Array<{ key: TEntityTypeGroup; label: string }>;
  basePath: string;
  activeCategory: string;
  categoryTypes: Record<string, string[]>;
};

export function EntityTypeTabs({ items, activeSlug, basePath, category }: EntityTypeTabsProps) {
  const { ref, canScrollLeft, canScrollRight } = useHorizontalScrollInfo();

  return (
    <div className="relative">
      <div className={classNames('bg-primary-9 relative flex')}>
        <div
          ref={ref}
          className={classNames(
            'no-scrollbar relative w-full overflow-x-auto scroll-smooth',
            'border-primary-6 border-0',
            items.length > 1 ? 'flex' : 'inline-block'
          )}
        >
          {canScrollLeft && (
            <div className="bg-primary-9 border-primary-6 sticky top-0 left-0 flex h-14 items-center justify-center border-0 border-t border-l px-4">
              <DotsHorizontal className="text-xl" />
            </div>
          )}
          {items?.map((tab) => (
            <NestedTypeLink
              key={tab.key}
              active={activeSlug === tab?.key}
              titleCls={items.length > 1 ? 'grow w-full' : 'inline-block'}
              title={tab.label}
              basePath={basePath}
              category={category}
              type={kebabCase(tab.key)}
            />
          ))}
          {canScrollRight && (
            <div className="bg-primary-9 border-primary-6 sticky top-0 right-0 flex h-14 items-center justify-center border-0 border-t border-r px-4">
              <DotsHorizontal className="text-xl" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function GroupTabs({ items, categoryTypes, activeCategory, basePath }: DataTypeTabsProps) {
  return (
    <div className="relative mb-6 flex w-full max-w-7xl items-center justify-between">
      <div className="border-primary-6 divide-primary-6 sticky top-0 right-0 left-0 z-10 grid grid-cols-3 items-center justify-center divide-x border">
        {items.map(({ key, label }) => {
          const couldBeActive = get(categoryTypes, key, []).at(0);
          return (
            <NestedCategoryLink
              key={key}
              activeCategory={activeCategory}
              category={key}
              label={label}
              basePath={basePath}
              type={couldBeActive}
            />
          );
        })}
      </div>
    </div>
  );
}

function NestedCategoryLink({
  basePath,
  category,
  type,
  activeCategory,
  label,
}: {
  basePath: string;
  category: string;
  type?: string;
  activeCategory: string;
  label: string;
}) {
  return (
    <Link
      href={{
        pathname: basePath,
        query: pickBy({ c: category, t: type }, (q) => !isNil(q) && !isEmpty(q)),
      }}
    >
      <NestedCategoryTitle
        {...{
          category,
          activeCategory,
          label,
        }}
      />
    </Link>
  );
}

function NestedCategoryTitle({
  category,
  activeCategory,
  label,
}: {
  category: string;
  activeCategory: string;
  label: string;
}) {
  const { pending } = useLinkStatus();
  return (
    <div
      className={classNames(
        'flex h-14 flex-auto items-center justify-center gap-2 px-6 py-2 font-bold transition-colors duration-150 ease-in-out focus:outline-none',
        pending && 'bg-black',
        category === activeCategory
          ? 'text-primary-9 bg-white font-bold'
          : 'bg-primary-9 hover:bg-primary-7 text-white'
      )}
    >
      <span>{label}</span>
      {pending && <LoadingOutlined />}
    </div>
  );
}

function NestedTypeLink({
  basePath,
  titleCls,
  title,
  active,
  category,
  type,
}: {
  basePath: string;
  titleCls: string;
  title: string;
  active: boolean;
  category: string;
  type: string;
}) {
  return (
    <Link
      href={{
        pathname: basePath,
        query: pickBy({ c: category, t: type }, (q) => !isNil(q) && !isEmpty(q)),
      }}
      className={classNames(
        titleCls,
        'border-primary-6 !border-r border-b-0',
        '[&:first-child]:!border-l',
        '[&:last-child]:!border-r'
      )}
    >
      <NestedTypeTitle title={title} active={active} />
    </Link>
  );
}

function NestedTypeTitle({ title, active }: { title: string; active: boolean }) {
  return (
    <div
      className={classNames(
        'flex h-14 items-center justify-center gap-2 rounded-none px-12 whitespace-nowrap transition-all duration-300',
        'border-primary-6 border !border-r border-b-0 first:border-l-0 last:border-r-0',
        active
          ? 'text-primary-8 hover:!text-primary-8 bg-white font-semibold'
          : 'hover:!text-primary-8 text-white hover:!bg-white'
      )}
    >
      <span>{title}</span>
    </div>
  );
}
