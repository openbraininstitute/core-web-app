import { ServerSideComponentProp } from '@/types/common';

import Form from '@/components/papers/PaperCreationView/Form';

export default async function CreatePaper({
  params: promisedParams,
}: ServerSideComponentProp<{ virtualLabId: string; projectId: string }, any>) {
  const params = await promisedParams;

  const { virtualLabId, projectId } = params;

  return (
    <div className="secondary-scrollbar my-4 flex h-full min-h-[calc(100vh-100px)] flex-col gap-y-2 overflow-y-auto bg-white p-8">
      <h2 className="text-primary-8 py-4 text-3xl font-bold">Create new paper</h2>
      <Form {...{ virtualLabId, projectId }} />
    </div>
  );
}
