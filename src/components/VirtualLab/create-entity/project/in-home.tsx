import { useState } from 'react';
import { CaretRightOutlined } from '@ant-design/icons';
import { Tabs } from 'antd';

import CreateEntityModal from '@/components/VirtualLab/create-entity/common/modal';
import VirtualLabsList from '@/components/VirtualLab/create-entity/project/list-vlabs';
import CreationForm from '@/components/VirtualLab/create-entity/project/form';
import { classNames } from '@/util/utils';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  vlabsList: Array<{ label: string; value: string }>;
};

export default function InHomeCreationModal({ vlabsList, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'vlab' | 'project'>('vlab');
  const [id, setSelectedVirtualLab] = useState<string | null>(null);

  const onNextStep = () => setActiveTab('project');
  const onPreviousStep = () => setActiveTab('vlab');
  const onSelect = (idt: string) => setSelectedVirtualLab(idt);

  const onModalClose = () => {
    setSelectedVirtualLab(null);
    setActiveTab('vlab');
    onClose();
  };

  return (
    <CreateEntityModal isOpen={isOpen} footer={null} onClose={onModalClose}>
      <div className="flex h-full flex-grow flex-col rounded-lg bg-white">
        <Tabs
          activeKey={activeTab}
          indicator={{ size: 0 }}
          items={[
            {
              key: 'vlab',
              label: 'VIRTUAL LAB',
              children: (
                <VirtualLabsList
                  id={id}
                  onSelect={onSelect}
                  onClose={onModalClose}
                  onNextStep={onNextStep}
                  disableNext={!id}
                  list={vlabsList}
                />
              ),
            },
            {
              disabled: true,
              className: 'cursor-default',
              key: 'separator',
              label: <CaretRightOutlined />,
            },
            {
              key: 'project',
              label: 'PROJECT',
              children: (
                <CreationForm
                  from="home"
                  virtualLabId={id!}
                  onPreviousStep={onPreviousStep}
                  onClose={onModalClose}
                />
              ),
            },
          ]}
          className={classNames(
            '[&_.ant-tabs-nav]:!mb-10 [&_.ant-tabs-nav]:border-b [&_.ant-tabs-nav]:border-gray-200 [&_.ant-tabs-nav]:!p-0',
            '[&_.ant-tabs-tab-active]:font-bold [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:!text-gray-500 [&_.ant-tabs-tab-btn]:!text-gray-400',
            '[&_.ant-tabs-content-holder]:flex [&_.ant-tabs-content-holder]:flex-grow [&_.ant-tabs-content-holder]:flex-col',
            '[&_.ant-tabs-content]:flex [&_.ant-tabs-content]:flex-grow [&_.ant-tabs-content]:flex-col',
            '[&_.ant-tabs-tabpane-active]:flex [&_.ant-tabs-tabpane-active]:flex-grow [&_.ant-tabs-tabpane-active]:flex-col',
            'flex h-full flex-grow flex-col p-2'
          )}
        />
      </div>
    </CreateEntityModal>
  );
}
