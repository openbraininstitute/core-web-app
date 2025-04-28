import { Button } from 'antd';
import EModelView from '@/components/build-section/cell-model-assignment/e-model/EModelView';
import useNavigateToBuildEmodelConfiguration from '@/hooks/useNavigateToBuildEmodelConfiguration';
import { IEModel } from '@/api/entitycore/types/entities/e-model';

type Params = {
  id: string;
  projectId: string;
  virtualLabId: string;
};

export default function Configuration({ params, data }: { params: Params; data: IEModel }) {
  const openConfigurationInBuild = useNavigateToBuildEmodelConfiguration();

  return (
    <div className="flex flex-col gap-6 pt-5">
      <EModelView showTitle={false} params={params} data={data as IEModel} />
      <div className="flex w-full items-end justify-end">
        {/* Temporarily disable button for SfN */}
        <Button onClick={openConfigurationInBuild} disabled size="large">
          Open in build
        </Button>
      </div>
    </div>
  );
}
