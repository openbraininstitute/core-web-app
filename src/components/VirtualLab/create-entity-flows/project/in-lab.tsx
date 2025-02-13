import CreateEntityModal from '@/components/VirtualLab/create-entity-flows/common/modal';
import CreationForm from '@/components/VirtualLab/create-entity-flows/project/form';

interface Props {
  virtualLabId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function InLabCreationModal({ isOpen, virtualLabId, onClose }: Props) {
  return (
    <CreateEntityModal isOpen={isOpen} footer={null} onClose={onClose}>
      <CreationForm from="vlab" virtualLabId={virtualLabId} onClose={onClose} />
    </CreateEntityModal>
  );
}
