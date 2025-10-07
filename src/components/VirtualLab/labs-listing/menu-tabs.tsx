'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LoadingOutlined, SearchOutlined } from '@ant-design/icons';
import { useState, useTransition } from 'react';
import { Button } from 'antd';
import Link from 'next/link';
import isEmpty from 'es-toolkit/compat/isEmpty';

import { Input } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { classNames } from '@/util/utils';

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  items: Tab[];
  activeTabId: string;
  basePath: string;
}

export default function Tabs({ items, activeTabId, basePath }: TabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchQuery = searchParams.get('q') || '';

  const [searchValue, setSearchValue] = useState(() => searchQuery);

  const handleSearchClick = () => setIsSearchVisible((prev) => !prev);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      let queryString = params.toString();
      if (isEmpty(e.target.value)) {
        params.delete('q');
      } else {
        params.set('q', e.target.value.toString());
      }
      queryString = params.toString();
      router.push(`${pathname}?${queryString}`);
    });
  };

  return (
    <div className="relative mx-auto mb-6 flex w-full max-w-7xl items-center justify-between">
      <div className="sticky top-0 right-0 left-0 z-10 flex">
        {items.map((tab) => (
          <Link
            data-testid={tab.key}
            role="tab"
            key={tab.key}
            href={`${basePath}?t=${tab.key}`}
            className={`px-4 py-2 transition-colors duration-150 ease-in-out focus:outline-none ${
              activeTabId === tab.key
                ? 'border-primary-9 text-primary-8 bg-white font-semibold' // Active tab styles
                : 'bg-primary-9 hover:bg-primary-7 text-white' // Inactive tab styles
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {activeTabId === 'membership-labs' && (
        <div className="flex items-center space-x-2">
          <Input
            allowClear
            placeholder="Search virtual lab..."
            value={searchValue}
            onChange={handleSearchChange}
            className={classNames(
              'border-b-white !bg-transparent transition-all duration-300 ease-in-out placeholder:!text-white',
              '!text-white hover:bg-transparent focus:bg-transparent',
              'hover:!border-b-white focus:!border-b-white',
              '[&_.ant-input]:placeholder:!text-white [&_.anticon]:text-white',
              isSearchVisible ? 'w-60 opacity-100' : 'w-0 opacity-0'
            )}
            style={{ visibility: isSearchVisible ? 'visible' : 'hidden' }}
          />
          <Button
            type="text"
            icon={
              pending ? (
                <LoadingOutlined className="text-xl text-white" />
              ) : (
                <SearchOutlined className="text-xl text-white" />
              )
            }
            onClick={handleSearchClick}
            className="!p-1"
          />
        </div>
      )}
    </div>
  );
}
