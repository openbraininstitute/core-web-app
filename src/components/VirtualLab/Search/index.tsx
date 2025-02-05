import { SearchOutlined } from '@ant-design/icons';
import { ConfigProvider } from 'antd';
import { useState } from 'react';
import { classNames } from '@/util/utils';

export default function useSearch(
  props: JSX.IntrinsicElements['input'] & { containerClassName?: string }
) {
  const [search, setSearch] = useState('');

  return {
    search,
    // eslint-disable-next-line react/jsx-props-no-spreading
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
          'flex w-max justify-between border-b bg-transparent pb-[2px]',
          containerClassName
        )}
      >
        <input
          {...rest} // eslint-disable-line react/jsx-props-no-spreading
          className={classNames(
            'mr-2 bg-transparent text-primary-3 outline-none placeholder:text-primary-3',
            className
          )}
        />
        <SearchOutlined />
      </div>
    </ConfigProvider>
  );
}
