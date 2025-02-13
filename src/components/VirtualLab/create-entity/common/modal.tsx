import { ConfigProvider, Modal } from 'antd';
import { classNames } from '@/util/utils';

type Props = {
  children: React.ReactNode;
  footer?: Array<JSX.Element> | null;
  isOpen: boolean;
  onClose: () => void;
  cls?: {
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
        className="custom-modal"
        closable={false}
        classNames={{
          content: classNames(
            '!rounded-none !py-10 !px-12 !min-h-[46rem] !flex !flex-col !w-full !h-full',
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
