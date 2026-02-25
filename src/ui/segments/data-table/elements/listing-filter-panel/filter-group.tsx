import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import * as Accordion from '@radix-ui/react-accordion';

import { ChevronIcon } from '@/components/icons';
import { classNames } from '@/util/utils';

import type { ReactElement } from 'react';
import type { TCoreFilter } from '@/entity-configuration/definitions/types';

import styles from '@/ui/segments/data-table/elements/listing-filter-panel/filters.module.css';

type ContentProps = {
  filters: Array<TCoreFilter>;
  setFilters: (filters: Array<TCoreFilter>) => void;
};

type FilterGroupProps = {
  items: {
    content?: (contentProps: ContentProps) => null | ReactElement<any>;
    display?: boolean;
    label: string;
    toggleFunc?: () => void;
  }[];
  filters: Array<TCoreFilter>;
  setFilters: (filters: Array<TCoreFilter>) => void;
};

export function FilterGroup({ items, filters, setFilters }: FilterGroupProps) {
  return (
    <Accordion.Root
      className="divide-primary-7 flex flex-col space-y-5 divide-y"
      defaultValue={['contributor', 'eType']}
      type="multiple"
    >
      {items?.map(({ content, display, label, toggleFunc }) => {
        const displayTrigger = display ? (
          <button
            key={label}
            type="button"
            aria-label="filter-panel-hide-field-button"
            onClick={toggleFunc}
          >
            <EyeOutlined style={{ color: 'white' }} />
          </button>
        ) : (
          <button
            key={label}
            type="button"
            aria-label="filter-panel-show-field-button"
            onClick={toggleFunc}
          >
            <EyeInvisibleOutlined
              style={{ color: '#69C0FF' }}
              aria-label="filter-panel-show-field-button"
            />
          </button>
        );

        return content ? (
          <Accordion.Item className="pt-5" value={label} key={label}>
            <div className="flex items-center gap-3">
              {toggleFunc && displayTrigger}
              <Accordion.Trigger
                className={classNames(
                  styles.accordionTrigger,
                  'flex w-full items-center justify-between'
                )}
              >
                <span className="text-lg font-bold text-white">{label}</span>
                <ChevronIcon className={styles.chevron} />
              </Accordion.Trigger>
            </div>
            <Accordion.Content className="py-4">
              {content({ filters, setFilters })}
            </Accordion.Content>
          </Accordion.Item>
        ) : (
          <div className="flex items-center gap-3 pt-5 text-lg text-white" key={label}>
            {toggleFunc && displayTrigger}
            <span className="font-bold">{label}</span>
          </div>
        );
      })}
    </Accordion.Root>
  );
}
