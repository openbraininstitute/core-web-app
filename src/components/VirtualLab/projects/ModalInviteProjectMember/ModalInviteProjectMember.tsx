import { Modal } from 'antd';
import { useState } from 'react';

import { InviteProjectMember } from './InviteProjectMember';
import { Member } from './types';

export interface ModalInviteProjectMemberProps {
  open: boolean;
  onChange(open: boolean): void;
}

export function ModalInviteProjectMember({ open, onChange }: ModalInviteProjectMemberProps) {
  const close = () => onChange(false);
  const [members, setMembers] = useState<Member[]>([]);

  return (
    <Modal
      open={open}
      title=""
      centered
      closable
      destroyOnClose
      onCancel={close}
      width="min(800px, 95vw)"
      footer={null}
    >
      <div className="flex w-full flex-col">
        <h2 className="text-xl font-bold text-primary-8">Invite new member to project</h2>
        <InviteProjectMember onClose={close} members={members} onChange={setMembers} />
      </div>
    </Modal>
  );
}
