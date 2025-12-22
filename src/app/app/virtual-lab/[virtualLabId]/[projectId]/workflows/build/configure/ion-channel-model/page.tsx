import { IonChannelModelBuilding } from '@/ui/segments/workflows/build/ion-channel-build';

import type { ServerSideComponentProp } from '@/types/common';

export default async function Page({
  searchParams,
}: ServerSideComponentProp<null, { sessionId: string }>) {
  let { sessionId } = await searchParams;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }

  return <IonChannelModelBuilding sessionId={sessionId} />;
}
