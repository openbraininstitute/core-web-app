import { ConfigProvider, Modal } from 'antd';
import type { JSX } from 'react';
import { classNames } from '@/util/utils';

type Props = {
  children: React.ReactNode;
  footer?: Array<JSX.Element> | null;
  isOpen: boolean;
  onClose: () => void;
  cls?: {
    parent?: string;
    content?: string;
    body?: string;
  };
};

export default function CreateEntityModal({ children, footer, isOpen, cls, onClose }: Props) {
  return (
    <ConfigProvider theme={{ hashed: false }}>
      <Modal
        centered
        destroyOnClose
        maskClosable
        open={isOpen}
        onCancel={onClose}
        footer={footer}
        width={650}
        className={classNames('custom-modal', cls?.parent)}
        closable={false}
        classNames={{
          content: classNames(
            'rounded-none! py-10! px-12! flex! flex-col! w-full! h-full!',
            cls?.content
          ),
          body: classNames('flex flex-col h-full flex-1', cls?.body),
        }}
      >
        {children}
      </Modal>
    </ConfigProvider>
  );
}
