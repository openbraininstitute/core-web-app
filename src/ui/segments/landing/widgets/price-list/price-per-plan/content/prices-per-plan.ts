export type PricePerPlanProps = {
  plan: string;
  notes: string;
  singleNeuronSimulation: {
    price: number;
    note: string | null;
  };
  smallMicrocircuitSimulation: {
    price: number;
    note: string | null;
  };
  runNotebooks: {
    price: number;
    note: string | null;
  };
};

export const PRICES_PER_PLAN: PricePerPlanProps[] = [
  {
    plan: 'Free',
    notes: '100 Initial Credits*',
    singleNeuronSimulation: {
      price: 1,
      note: null,
    },
    smallMicrocircuitSimulation: {
      price: 0.2,
      note: '/neuron/second of biological time',
    },
    runNotebooks: {
      price: 4,
      note: '/hour',
    },
  },
  {
    plan: 'Pro',
    notes: '50 Credits /month or 650 Credits /year*',
    singleNeuronSimulation: {
      price: 1,
      note: null,
    },
    smallMicrocircuitSimulation: {
      price: 0.1,
      note: '/neuron/second of biological time',
    },
    runNotebooks: {
      price: 2,
      note: '/hour',
    },
  },
];
