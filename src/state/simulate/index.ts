import { SimulationType } from '@/types/virtual-lab/lab';
import { atom } from 'jotai';

// TODO: this is can be removed, let's check later
export const selectedSimulationScopeAtom = atom<SimulationType>(SimulationType.SingleNeuron);
