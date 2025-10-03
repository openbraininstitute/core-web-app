import dynamic from 'next/dynamic';

import groupBy from 'lodash/groupBy';
import { AllowedTypes } from '@/features/model-analysis/viewer/storage';
import type { IValidationConstructedResult } from '@/features/model-analysis/explorer/context';
import type { TAllowedTypes } from '@/features/model-analysis/viewer/storage';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';
import { IEntity } from '@/api/entitycore/types/entities/entity';
import { EntityCoreBaseAsset } from '@/api/entitycore/types/shared/global';
import { EntityTypeDict } from '@/api/entitycore/types';

const Viewer = dynamic(() => import('@/features/model-analysis/viewer/viewer'), {
  ssr: false,
});

type Props = {
  validationResults: IValidationConstructedResult | null;
};

export function ViewerContainer({ validationResults }: Props) {
  const allowedValidationResults = validationResults?.filter((o) =>
    o.assets?.some((obj) => AllowedTypes.includes(obj.content_type as TAllowedTypes))
  );

  const groupedvalidationResults = groupBy(allowedValidationResults, 'name');

  return (
    <Tabs defaultMessage="No validation results found">
      {Object.entries(groupedvalidationResults).map(([name, results]) => {
        return (
          <Tab label={name} key={name}>
            {results.map((r) => (
              <Viewer
                entity={r as IEntity & EntityCoreBaseAsset}
                key={r.id}
                entityType={EntityTypeDict.ValidationResult}
                pdfShowPageCount={false}
              />
            ))}
          </Tab>
        );
      })}
    </Tabs>
  );
}
