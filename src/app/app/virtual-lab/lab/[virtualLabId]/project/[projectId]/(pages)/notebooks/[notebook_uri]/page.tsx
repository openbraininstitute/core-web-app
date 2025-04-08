import { ServerSideComponentProp } from '@/types/common';

export default async function VirtualLab(props: ServerSideComponentProp<{ notebook_uri: string }>) {
  const params = await props.params;

  const {
    notebook_uri
  } = params;

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
