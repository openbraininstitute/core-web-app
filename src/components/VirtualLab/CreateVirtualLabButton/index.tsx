import { useState } from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import CreationSteps from '@/components/VirtualLab/create-entity/virtual-lab';

export default function CreateVirtualLabButton() {
  const [openModal, setOpenModal] = useState(false);
  const onClose = () => setOpenModal(false);
  const onOpen = () => setOpenModal(true);

  return (
    <>
      <Button
        className="mr-5 h-12 w-52 rounded-none border-none text-sm font-bold"
        onClick={onOpen}
      >
        <span className="relative text-primary-8">Create virtual lab</span>
        <PlusOutlined className="relative left-3" />
      </Button>
      <CreationSteps isOpen={openModal} onClose={onClose} />
    </>
  );
}
