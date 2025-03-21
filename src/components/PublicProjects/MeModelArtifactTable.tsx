import { MEModelsProps } from './type';

export default function MeModelArtifactTable({ content }: { content: MEModelsProps[] }) {
  return <div>Hello {JSON.stringify(content)}</div>;
}
