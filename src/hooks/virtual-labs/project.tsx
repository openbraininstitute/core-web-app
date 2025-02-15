import { CloseOutlined } from '@ant-design/icons';
import { ConfigProvider, Modal } from 'antd';
import { useRef } from 'react';

import BalanceTransferForm from '@/components/VirtualLab/projects/VirtualLabProjectAdmin/BalanceTransferForm';

const modalTheme = {
  token: {
    colorBgBase: 'white',
    colorTextBase: 'black',
  },
};

export default function useBalanceTransferModal() {
  const [modal, contextHolder] = Modal.useModal();
  const destroyRef = useRef<() => void>();
  const onClose = () => destroyRef?.current?.();

  const createModal = ({
    virtualLabId,
    projectId,
    onTransferSuccess,
  }: {
    virtualLabId: string;
    projectId: string;
    onTransferSuccess: () => void;
  }) => {
    const { destroy } = modal.confirm({
      title: null,
      icon: null,
      closable: true,
      maskClosable: true,
      footer: null,
      width: 680,
      centered: true,
      mask: true,
      styles: {
        mask: { background: '#002766' },
        body: { padding: '60px 40px 20px' },
      },
      closeIcon: <CloseOutlined className="text-2xl text-primary-8" />,
      className: '![&>.ant-modal-content]:bg-red-500',
      content: (
        <BalanceTransferForm
          virtualLabId={virtualLabId}
          projectId={projectId}
          onClose={onClose}
          onTransferSuccess={onTransferSuccess}
        />
      ),
    });

    destroyRef.current = destroy;

    return destroy;
  };

  return {
    createModal,
    contextHolder: <ConfigProvider theme={modalTheme}>{contextHolder}</ConfigProvider>,
  };
}
