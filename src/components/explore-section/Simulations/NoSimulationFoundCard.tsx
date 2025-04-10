import NoSimulationFoundIcon from '@/components/icons/NoSimulationFoundIcon';

export default function NoSimulationFoundCard() {
  return (
    <div className="bg-neutral-1 flex h-52 w-96 items-center justify-center rounded-sm">
      <div className="text-neutral-5 m-24 text-center font-semibold">
        <NoSimulationFoundIcon className="m-auto block" />
        <div className="mt-2">No Simulation for these dimensions combination</div>
      </div>
    </div>
  );
}
