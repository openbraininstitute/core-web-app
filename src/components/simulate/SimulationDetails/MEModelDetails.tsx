import Link from 'next/link';
import { classNames } from '@/util/utils';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';

import { IMEModel } from '@/api/entitycore/types';
import PreviewThumbnail from '@/features/thumbnail/preview';

type Props = {
  type: 'single-neuron-simulation' | 'synaptome-simulation';
  virtualLabId: string;
  projectId: string;
  meModel: IMEModel;
};

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="text-primary-7 mr-10 mb-4 text-sm">
      <div className="text-neutral-4 uppercase">{label}</div>
      <div className={classNames(className)}>{value}</div>
    </div>
  );
}

export default function ModelDetails({ type, virtualLabId, projectId, meModel }: Props) {
  const generateMeModelDetailView = () => {
    const vlProjectUrl = generateVlProjectUrl(virtualLabId, projectId);
    const baseExploreUrl = `${vlProjectUrl}/explore/interactive/model/me-model`;
    return `${baseExploreUrl}/${meModel.id}`;
  };

  return (
    <div>
      <h1 className="text-primary-8 mb-3 text-3xl font-bold">Model</h1>
      <div className="relative flex max-h-fit items-start gap-4 rounded-sm border border-neutral-200 px-8 py-6">
        <Link
          href={generateMeModelDetailView()}
          className="text-primary-8 hover:text-primary-7 absolute top-6 right-8 flex items-center justify-center font-bold"
        >
          View details
        </Link>
        <div className="flex flex-col">
          <span className="text-neutral-4 mb-2 text-base uppercase">
            {type === 'single-neuron-simulation' ? 'Single neuron model' : 'Synaptome'}
          </span>
          <div className="flex items-start gap-2">
            <div className="border-neutral-3 flex h-56 w-56 items-center justify-center border">
              <PreviewThumbnail resource={meModel.morphology} width={400} height={400} />
            </div>

            <div className="border-neutral-3 flex h-56 w-56 items-center justify-center border">
              <PreviewThumbnail resource={meModel.emodel} width={400} height={400} />
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <div className="pl-12">
            <Field
              label="Name"
              value={meModel.name}
              className="text-primary-8 my-1 text-3xl font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pl-12">
            <Field label="ME-Model" value={meModel.name} />
            <Field label="E-Model" value={meModel.emodel.name} />
            <Field label="M-Model" value={meModel.morphology.name} />
            <Field label="Brain Region" value={meModel.brain_region.name} />

            {meModel.mtypes && meModel.mtypes.length > 0 && (
              <Field label="M-Types" value={meModel.mtypes.map((m) => m.pref_label).join(',')} />
            )}
            {meModel.etypes && meModel.etypes.length > 0 && (
              <Field label="E-Types" value={meModel.etypes.map((m) => m.pref_label).join(',')} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
