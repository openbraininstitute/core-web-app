/* eslint-disable react/jsx-props-no-spreading */

'use client';

import { SearchOutlined } from '@ant-design/icons';
import { ConfigProvider } from 'antd';
import { Input } from 'antd/lib';
import { useState } from 'react';

import { cn } from '@/utils/css-class';

interface UseSearchProps {
  placeholder?: string;
  containerClassName?: string;
  className?: string;
}

export function useSearch({
  placeholder = 'Search...',
  containerClassName,
  className,
}: UseSearchProps) {
  const [search, setSearch] = useState('');

  const Search = (
    <div className={cn('flex w-max items-center gap-2', containerClassName)}>
      <ConfigProvider
        theme={{
          token: {
            colorBgContainer: 'transparent',
            colorBorder: 'transparent',
            colorText: '#002766',
            colorTextPlaceholder: '#8c8c8c',
          },
        }}
      >
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn('flex w-max justify-between border-b bg-transparent', className)}
          suffix={<SearchOutlined className="text-primary-9" />}
        />
      </ConfigProvider>
    </div>
  );

  return { search, Search };
}
