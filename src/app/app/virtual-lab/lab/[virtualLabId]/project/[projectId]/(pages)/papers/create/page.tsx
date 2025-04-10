import { ServerSideComponentProp } from '@/types/common';

import Form from '@/components/papers/PaperCreationView/Form';

export default async function CreatePaper(
  props: ServerSideComponentProp<{ virtualLabId: string; projectId: string }>
) {
  const params = await props.params;

  const {
    virtualLabId,
    projectId
  } = params;

  return (
    <div className="secondary-scrollbar my-4 flex h-full min-h-[calc(100vh-100px)] flex-col gap-y-2 overflow-y-auto bg-white p-8">
      <h2 className="py-4 text-3xl font-bold text-primary-8">Create new paper</h2>
      <Form {...{ virtualLabId, projectId }} />
    </div>
  );
}
