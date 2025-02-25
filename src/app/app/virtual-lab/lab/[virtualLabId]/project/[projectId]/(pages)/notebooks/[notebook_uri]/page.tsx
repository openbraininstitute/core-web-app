import { ServerSideComponentProp } from '@/types/common';

export default function VirtualLab({
  params: { notebook_uri },
}: ServerSideComponentProp<{ notebook_uri: string }>) {
  return (
    <div className="h-full w-full bg-white">
      <iframe
        title={notebook_uri}
        src={`https://nbviewer.org/github/${notebook_uri}`}
        width="100%"
        height="100%"
      />
    </div>
  );
}
