'use client';

import Summary from '@/components/explore-section/details-view/summary';
import Simulations from '@/components/explore-section/Simulations';
import { DetailProps } from '@/types/explore-section/application';
import { SimulationCampaign } from '@/types/explore-section/delta-simulation-campaigns';
import { Field } from '@/constants/explore-section/fields-config/enums';

const fields: DetailProps[] = [
  {
    field: Field.Description,
  },
  {
    field: Field.BrainConfiguration,
  },
  {
    field: Field.Dimensions,
  },
  {
    field: Field.Attributes,
  },
  {
    field: Field.Tags,
  },
  {
    field: Field.SimulationCampaignStatus,
  },
  {
    field: Field.CreatedBy,
  },
  {
    field: Field.CreatedAt,
  },
];

export default function SimulationCampaignDetailPage() {
  return (
    <Summary fields={fields}>
      {(detail) => (
        <div>
          <hr />
          <Simulations resource={detail as SimulationCampaign} />
        </div>
      )}
    </Summary>
  );
}
