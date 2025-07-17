import { PricePerPlanProps } from '../content/PRICES_PER_PLAN';

export default function SinglePriceColumn({ content }: { content: PricePerPlanProps }) {
  return (
    <div className="flex flex-col gap-y-6">
      <div className="text-primary-8 flex flex-col gap-4">
        <div>
          <div className="text-[19px]">Single Neuron Simulation</div>
          <div className="text-2xl font-bold">{content.singleNeuronSimulation.price} Credits</div>
          {content.singleNeuronSimulation.note && (
            <div className="relative -top-px text-lg leading-[1.3]">
              {content.singleNeuronSimulation.note}
            </div>
          )}
        </div>
      </div>
      <div className="text-primary-8 flex flex-col gap-4">
        <div>
          <div className="text-[19px]">Small Microcircuit Simulation</div>
          <div className="text-2xl font-bold">
            {content.smallMicrocircuitSimulation.price} Credits
          </div>
          {content.smallMicrocircuitSimulation.note && (
            <div className="relative -top-px text-lg leading-[1.3]">
              {content.smallMicrocircuitSimulation.note}
            </div>
          )}
        </div>
      </div>
      <div className="text-primary-8 flex flex-col gap-4">
        <div>
          <div className="text-[19px]">Run Notebooks</div>
          <div className="text-2xl font-bold">{content.runNotebooks.price} Credits</div>
          {content.runNotebooks.note && (
            <div className="relative -top-px text-lg leading-[1.3]">
              {content.runNotebooks.note}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
