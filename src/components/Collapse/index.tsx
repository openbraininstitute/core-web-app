import { classNames } from '@/util/utils';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { Collapse as AntdCollapse, CollapseProps, ConfigProvider } from 'antd';

export function ExpandIcon({ isActive }: { isActive?: boolean }) {
  return isActive ? (
    <MinusOutlined style={{ fontSize: '14px' }} />
  ) : (
    <PlusOutlined style={{ fontSize: '14px' }} />
  );
}

export default function Collapse({ className, items, activeKey, onChange }: CollapseProps) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorText: '#003A8C',
        },
        components: {
          Collapse: {
            headerBg: 'transparent', // Used in conjunction with "background" style definition below
            headerPadding: '24px 28px',
            contentPadding: '20px 0 20px',
            borderRadiusLG: 0,
            contentBg: '#002766',
            colorBorder: '#002766',
            fontSize: 20,
          },
        },
      }}
    >
      <AntdCollapse
        accordion
        destroyInactivePanel
        activeKey={activeKey}
        onChange={onChange}
        expandIconPosition="end"
        expandIcon={ExpandIcon}
        className={classNames(className)}
        items={items?.map((item) => ({
          style: { background: '#fff' },
          headerClass: 'font-bold !items-center', // TODO: See whether there's a better way to align center.
          ...item,
        }))}
      />
    </ConfigProvider>
  );
}
