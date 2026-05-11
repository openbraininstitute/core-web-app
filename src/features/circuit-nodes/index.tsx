import dynamic from 'next/dynamic';

export const CircuitNodesTable = dynamic(() => import('./circuit-nodes-table'), { ssr: false });

export type { DisplayMode } from '@/features/circuit-nodes/types';
