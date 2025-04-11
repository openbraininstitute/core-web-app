import Link from 'next/link';

import CardVisualization from '@/components/explore-section/CardView/CardVisualization';

import { EModelThumbnail } from '@/components/build-section/virtual-lab/me-model/EModelCard';
import { DataType } from '@/constants/explore-section/list-views';
import { MEModel, MEModelResource } from '@/types/me-model';
import { EModel, NeuronMorphology } from '@/types/e-model';
import { DisplayMessages } from '@/constants/display-messages';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { to64 } from '@/util/common';
import { getOrgAndProjectFromProjectId } from '@/util/nexus';
import { getEtype, getMtype } from '@/util/modelMEtypes';

export function MEModelConfiguration({
  meModel,
  mModel,
  eModel,
  virtualLabId,
  projectId,
}: {
  meModel: MEModelResource;
  mModel: NeuronMorphology;
  eModel: EModel;
  virtualLabId: string;
  projectId: string;
}) {
  const generateMeModelDetailView = () => {
    const vlProjectUrl = generateVlProjectUrl(virtualLabId, projectId);
    const baseBuildUrl = `${vlProjectUrl}/explore/interactive/model/me-model`;
    const { org, project } = getOrgAndProjectFromProjectId(meModel._project);
    return `${baseBuildUrl}/${to64(`${org}/${project}!/!${meModel['@id']}`)}`;
  };

  return (
    <div className="relative mt-2 flex gap-10 rounded-md border border-gray-400 p-4">
      <Link
        href={generateMeModelDetailView()}
        className="text-primary-8 hover:text-primary-7 absolute top-4 right-4 flex items-center justify-center font-bold"
      >
        View details
      </Link>
      <div className="flex flex-col items-start gap-2">
        <div className="mb-2 text-xl font-light text-gray-400 uppercase">single neuron model</div>
        <div className="flex items-start gap-2">
          <div className="border-neutral-3 flex h-56 w-56 items-center justify-center border">
            <CardVisualization
              dataType={DataType.ExperimentalNeuronMorphology}
              resource={mModel}
              height={200}
              width={200}
            />
          </div>
          <div className="border-neutral-3 flex h-56 w-56 items-center justify-center border">
            <EModelThumbnail emodel={eModel} />
          </div>
        </div>
      </div>
      <div className="mt-12 grow">
        <div className="text-neutral-4 font-thin uppercase">NAME</div>
        <div className="text-primary-8 my-1 text-3xl font-bold">{meModel.name}</div>
        <MeModelDetails meModel={meModel} eModel={eModel} mModel={mModel} />
      </div>
    </div>
  );
}

type ModelDetails = {
  meModel: MEModel;
  eModel: EModel;
  mModel: NeuronMorphology;
};

function MeModelDetails({ meModel, eModel, mModel }: ModelDetails) {
  const mType = getMtype(meModel, mModel) ?? DisplayMessages.NO_DATA_STRING;
  const eType = getEtype(meModel, eModel) ?? DisplayMessages.NO_DATA_STRING;

  return (
    <div className="text-primary-8 mt-4 grid grid-cols-[max-content_max-content] gap-4 gap-x-12">
      <div className="col-span-1">
        <div className="text-neutral-4 font-thin uppercase">m-model</div>
        <div className="line-clamp-1">{mModel.name || DisplayMessages.NO_DATA_STRING}</div>
      </div>
      <div className="col-span-1">
        <div className="text-neutral-4 font-thin uppercase">e-model</div>
        <div className="line-clamp-1">{eModel.name || DisplayMessages.NO_DATA_STRING}</div>
      </div>
      <div className="col-span-1">
        <div className="text-neutral-4 font-thin uppercase">Brain Region</div>
        <div className="line-clamp-1">
          {meModel.brainLocation?.brainRegion?.label || DisplayMessages.NO_DATA_STRING}
        </div>
      </div>
      <div className="col-span-1">
        <div className="text-neutral-4 font-thin uppercase">E-Type</div>
        <div className="line-clamp-1">{eType}</div>
      </div>
      <div className="col-span-2">
        <div className="text-neutral-4 font-thin uppercase">M-Type</div>
        <div className="line-clamp-1">{mType}</div>
      </div>
    </div>
  );
}
