import { ServerSideComponentProp } from '@/types/common';

export default async function VirtualLab({
  params: promisedParams,
}: ServerSideComponentProp<{ notebook_uri: string }, any>) {
  const params = await promisedParams;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { notebook_uri: notebookUri } = params;

  return (
    <div className="h-full w-full bg-white">
      <iframe
        title={notebookUri}
        src={`https://nbviewer.org/github/${notebookUri}`}
        width="100%"
        height="100%"
      />
    </div>
  );
}
