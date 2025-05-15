import Link from 'next/link';
import { Skeleton } from 'antd';

import { EModelThumbnail } from '@/features/entities/me-model/detail-view/card-viewers/emodel-overview-card';
import { DisplayMessages } from '@/constants/display-messages';
import { DataType } from '@/constants/explore-section/list-views';
import { EModel, NeuronMorphology } from '@/types/e-model';
import { MEModelResource } from '@/types/me-model';
import { classNames } from '@/util/utils';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { to64 } from '@/util/common';

import CardVisualization from '@/components/explore-section/CardView/CardVisualization';
import { getEtype, getMtype } from '@/util/modelMEtypes';
import { IMEModel } from '@/api/entitycore/types';
import { useEffect, useState } from 'react';
import { getMEModel } from '@/api/entitycore/queries';
import { LoadingOutlined } from '@ant-design/icons';

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
            {/* {mModel ? (
              <div className="border-neutral-3 flex h-56 w-56 items-center justify-center border">
                <CardVisualization
                  dataType={DataType.ExperimentalNeuronMorphology}
                  resource={mModel}
                  height={200}
                  width={200}
                />
              </div>
            ) : (
              <Skeleton.Image className="h-full w-full rounded-none" />
            )}
            {eModel ? (
              <div className="border-neutral-3 flex h-56 w-56 items-center justify-center border">
                <EModelThumbnail emodel={eModel} />
              </div>
            ) : (
              <Skeleton.Image className="h-full w-full rounded-none" />
            )} */}
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
