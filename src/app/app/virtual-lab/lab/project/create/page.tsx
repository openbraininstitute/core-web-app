import { Metadata } from 'next';
import CreateProjectFlow from '@/components/VirtualLab/create-entity-flows/project';
import { ServerSideComponentProp } from '@/types/common';

export const metadata: Metadata = {
  title: 'Project creation flow',
  description: 'Easily create and configure project with a user-friendly workflow.',
};

export default async function Page(props: ServerSideComponentProp<{ virtualLabId: string }>) {
  const params = await props.params;

  const {
    virtualLabId
  } = params;

  return <CreateProjectFlow virtualLabId={virtualLabId} />;
}
