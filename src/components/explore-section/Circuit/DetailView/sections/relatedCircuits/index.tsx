import ParentCircuit from './ParentCircuit';
import SubcircuitsList from './SubcircuitsList';

export default function RelatedCircuitsSection() {
  return (
    <div className="max-w-[calc(100vh - 80px)] relative flex min-h-[60vh] w-full flex-col gap-y-20 overflow-hidden overflow-x-auto">
      <div className="relative flex w-full flex-col">
        <div className="mb-12 w-full bg-primary-8 px-4 py-3 text-xl font-normal text-white">
          Parent circuit
        </div>

        <div className="flex flex-col gap-y-8">
          <ParentCircuit />
        </div>
      </div>
      <div className="relative flex w-full flex-col">
        <div className="mb-3 w-full bg-primary-8 px-4 py-3 text-xl font-normal text-white">
          Subcircuit
        </div>

        <div className="flex flex-col gap-y-8">
          <SubcircuitsList />
        </div>
      </div>
      <div className="relative flex w-full flex-col">
        <div className="mb-3 w-full bg-primary-8 px-4 py-3 text-xl font-normal text-white">
          Derived circuits
        </div>

        <div className="flex flex-col gap-y-8">
          <SubcircuitsList />
        </div>
      </div>
    </div>
  );
}
