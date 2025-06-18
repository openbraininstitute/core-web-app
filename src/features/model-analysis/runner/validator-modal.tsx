'use client';

import { useRef } from 'react';
import { Modal } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

import ModelAnalysisContainer from '@/features/model-analysis/runner/validator-modal-elements';
import { WorkspaceContext } from '@/types/common';

export function usePendingValidationModal() {
  const [modal, contextHolder] = Modal.useModal();
  const destroyRef = useRef<() => void>(undefined);

  function createModal({
    ctx,
    accessToken,
    modelId,
  }: {
    ctx: WorkspaceContext;
    accessToken: string;
    modelId: string;
  }) {
    const { destroy } = modal.confirm({
      title: null,
      icon: null,
      closable: false,
      maskClosable: false,
      footer: null,
      width: 680,
      centered: true,
      mask: true,
      styles: {
        mask: { background: '#002766ba' },
        body: { padding: '60px 40px 20px' },
      },
      closeIcon: <CloseOutlined className="text-primary-8 text-2xl" />,
      className: '![&>.ant-modal-content]:bg-red-500',
      content: <ModelAnalysisContainer ctx={ctx} modelId={modelId} accessToken={accessToken} />,
    });
    destroyRef.current = destroy;
    return destroy;
  }

  return {
    createModal,
    contextHolder,
  };
}
