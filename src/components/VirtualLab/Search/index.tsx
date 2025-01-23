import { classNames } from '@/util/utils';
import { SearchOutlined } from '@ant-design/icons';
import { ConfigProvider } from 'antd';
import { prop } from 'lodash/fp';

export default function Search(
  props: JSX.IntrinsicElements['input'] & { containerClassName?: string }
) {
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
          props.containerClassName
        )}
      >
        <input
          {...props}
          className={classNames(
            'mr-2 bg-transparent text-primary-3 outline-none placeholder:text-primary-3',
            props.className
          )}
        />
        <SearchOutlined />
      </div>
    </ConfigProvider>
  );
}
