import { atom } from 'jotai';
import { SimulationType } from '@/types/virtual-lab/lab';

// TODO: this is can be removed, let's check later
export const selectedSimulationScopeAtom = atom<SimulationType>(SimulationType.SingleNeuron);
