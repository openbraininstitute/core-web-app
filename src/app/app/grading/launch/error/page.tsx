import { COPY, isLaunchErrorReason } from '../_errors';

import type { ServerSideComponentProp } from '@/types/common';

export default async function Page({
  searchParams,
}: ServerSideComponentProp<null, { reason?: string }>) {
  const { reason } = await searchParams;
  const key = isLaunchErrorReason(reason) ? reason : 'invalid';
  const { title, body } = COPY[key];

  return (
    <div className="flex max-w-md flex-col items-center justify-center space-y-4 px-6 text-center">
      <h2 className="text-primary-8 text-xl font-bold">{title}</h2>
      <p className="text-primary-7">{body}</p>
    </div>
  );
}
