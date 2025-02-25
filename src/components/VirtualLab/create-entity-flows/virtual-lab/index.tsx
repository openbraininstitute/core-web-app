import CreationContent from '@/components/VirtualLab/create-entity-flows/virtual-lab/form';
import StepMenu from '@/components/VirtualLab/create-entity-flows/virtual-lab/step-menu';

export default function Flow() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <div className="mx-auto flex h-full  w-full flex-grow flex-col">
        <div className="flex h-full w-full flex-grow flex-col">
          <StepMenu />
          <CreationContent />
        </div>
      </div>
    </div>
  );
}
