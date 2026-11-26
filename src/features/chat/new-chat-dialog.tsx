'use client';

import { Input, Modal, Segmented, Select } from 'antd';
import { useState } from 'react';

import { useCreateConversation, usePeople } from './hooks';

/**
 * Starts a direct chat with one person, or a group with several, from the people in your labs.
 * A direct chat with someone you already have one with opens that one.
 */
export function NewChatDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [kind, setKind] = useState<'direct' | 'group'>('direct');
  const [chosen, setChosen] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const { data: people, isLoading } = usePeople(open);
  const create = useCreateConversation();

  const reset = () => {
    setChosen([]);
    setTitle('');
    create.reset();
  };
  const ready = kind === 'direct' ? chosen.length === 1 : chosen.length >= 1;

  return (
    <Modal
      open={open}
      title="New chat"
      okText={kind === 'direct' ? 'Open chat' : 'Create group'}
      okButtonProps={{ disabled: !ready, loading: create.isPending }}
      onCancel={() => {
        reset();
        onClose();
      }}
      onOk={async () => {
        const { id } = await create.mutateAsync({
          kind,
          userIds: chosen,
          ...(kind === 'group' && title.trim() ? { title: title.trim() } : {}),
        });
        reset();
        onCreated(id);
      }}
      destroyOnHidden
    >
      <div className="flex flex-col gap-4 pt-2">
        <Segmented
          value={kind}
          onChange={(v) => {
            setKind(v as 'direct' | 'group');
            setChosen((c) => (v === 'direct' ? c.slice(0, 1) : c));
          }}
          options={[
            { label: 'Direct', value: 'direct' },
            { label: 'Group', value: 'group' },
          ]}
        />
        <Select
          mode={kind === 'group' ? 'multiple' : undefined}
          showSearch
          loading={isLoading}
          placeholder={isLoading ? 'Finding the people in your labs…' : 'Who'}
          value={kind === 'group' ? chosen : chosen[0]}
          onChange={(v: string | string[]) => setChosen(Array.isArray(v) ? v : v ? [v] : [])}
          optionFilterProp="label"
          options={(people ?? []).map((p) => ({ label: p.name, value: p.id }))}
          notFoundContent={isLoading ? 'Loading…' : 'Nobody in your labs by that name'}
        />
        {kind === 'group' && (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Group name (optional)"
            maxLength={80}
          />
        )}
        {create.isError && <p className="text-destructive text-sm">{String(create.error)}</p>}
        <p className="text-neutral-4 text-xs">
          You can chat with anyone in a lab you belong to. Lab and project chats need no setting up:
          everyone in them is already there.
        </p>
      </div>
    </Modal>
  );
}
