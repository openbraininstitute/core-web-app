import { Metadata } from 'next';
import CreateVirtualLabFlow from '@/components/VirtualLab/create-entity-flows/virtual-lab';

export const metadata: Metadata = {
  title: 'Virtual lab creation flow',
  description: 'Easily create and configure virtual labs with a user-friendly workflow.',
};

export default function Page() {
  return <CreateVirtualLabFlow />;
}
