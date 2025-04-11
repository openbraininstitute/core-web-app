'use client';

import { useSaveModal } from './save-modal-hook';
import GenericButton from '@/components/Global/GenericButton';

export default function SaveButton() {
  const { createModal, contextHolder } = useSaveModal();

  return (
    <>
      <GenericButton
        text="Save ME-Model"
        className="bg-secondary-3 absolute right-5 bottom-5 mt-8 w-15 text-white"
        onClick={createModal}
      />
      {contextHolder}
    </>
  );
}
