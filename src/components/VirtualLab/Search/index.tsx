import { SearchOutlined } from '@ant-design/icons';
import { ConfigProvider } from 'antd';
import { useState, type JSX } from 'react';
import { classNames } from '@/util/utils';

export default function useSearch(
  props: JSX.IntrinsicElements['input'] & { containerClassName?: string }
) {
  const [search, setSearch] = useState('');

  return {
    search,

    Search: <Search {...props} value={search} onChange={(e) => setSearch(e.currentTarget.value)} />,
  };
}

function Search(props: JSX.IntrinsicElements['input'] & { containerClassName?: string }) {
  const { containerClassName, className, ...rest } = props;

  return (
    <ConfigProvider
      theme={{
        components: {
          Input: {
            colorTextPlaceholder: '#69C0FF',
            colorBgContainer: 'transparent',
          },
          Button: {
            colorPrimary: 'transparent',
          },
        },
      }}
    >
      <div
        className={classNames(
          'flex w-max justify-between border-b bg-transparent',
          containerClassName
        )}
      >
        <input
          {...rest}
          className={classNames(
            'text-primary-3 placeholder:text-primary-3 mr-2 bg-transparent outline-hidden',
            className
          )}
        />
        <SearchOutlined />
      </div>
    </ConfigProvider>
  );
}
