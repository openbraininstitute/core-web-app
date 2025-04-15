import { LoadingOutlined } from '@ant-design/icons';
import Link, { useLinkStatus } from 'next/link';

import kebabCase from 'lodash/kebabCase';
import isEmpty from 'lodash/isEmpty';
import pickBy from 'lodash/pickBy';
import isNil from 'lodash/isNil';
import get from 'lodash/get';

import { toPascalCase } from '@/utils/string';
import { classNames } from '@/util/utils';

type Tab = {
  key: string;
  label: string;
};

type EntityTypeTabsProps = {
  items: Tab[];
  activeType: string;
  basePath: string;
  category: string;
};

type DataTypeTabsProps = {
  items: Tab[];
  basePath: string;
  activeCategory: string;
  categoryTypes: Record<string, string[]>;
};

export function EntityTypeTabs({ items, activeType, basePath, category }: EntityTypeTabsProps) {
  return (
    <div className="relative">
      <div className={classNames('bg-primary-9 relative flex')}>
        <div
          className={classNames(
            'w-full overflow-x-hidden scroll-smooth',
            items.length > 1 ? 'flex' : 'inline-block'
          )}
        >
          {items?.map((tab) => (
            <NestedTypeLink
              key={tab.key}
              active={toPascalCase(activeType) === tab?.key}
              titleCls={items.length > 1 ? 'grow w-full' : 'inline-block'}
              title={tab.label}
              basePath={basePath}
              category={category}
              type={kebabCase(tab.key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DataTypeTabs({
  items,
  categoryTypes,
  activeCategory,
  basePath,
}: DataTypeTabsProps) {
  return (
    <div className="relative mx-auto mb-6 flex w-full max-w-7xl items-center justify-between">
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
              type={kebabCase(couldBeActive)}
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
      className={titleCls}
    >
      <NestedTypeTitle title={title} active={active} />
    </Link>
  );
}

function NestedTypeTitle({ title, active }: { title: string; active: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <div
      className={classNames(
        'flex h-14 items-center justify-center gap-2 rounded-none px-12 whitespace-nowrap transition-all duration-300',
        'border-primary-6 border !border-r border-b-0',
        active
          ? 'text-primary-8 hover:!text-primary-8 bg-white font-semibold'
          : 'hover:!text-primary-8 text-white hover:!bg-white'
      )}
    >
      <span>{title}</span>
      {pending && <LoadingOutlined />}
    </div>
  );
}
