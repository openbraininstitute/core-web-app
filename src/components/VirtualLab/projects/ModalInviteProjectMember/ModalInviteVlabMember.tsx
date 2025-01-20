import { Modal } from 'antd';
import { useState } from 'react';

import { Member } from './types';
import { InviteVlabMember } from './InviteVlabMember';

export interface ModalInviteVlabMemberProps {
  open: boolean;
  onChange(open: boolean): void;
}

export function ModalInviteVlabMember({ open, onChange }: ModalInviteVlabMemberProps) {
  const close = () => onChange(false);
  const [members, setMembers] = useState<Member[]>([]);
  return (
    <Modal
      open={open}
      centered
      closable
      destroyOnClose
      onCancel={close}
      width="min(800px, 95vw)"
      footer={null}
    >
      <div className="flex w-full flex-col">
        <h2 className="text-xl font-bold uppercase text-primary-8">
          Invite new member to virtual lab
        </h2>
        <InviteVlabMember onClose={close} members={members} onChange={setMembers} />
      </div>
    </Modal>
  );
}
