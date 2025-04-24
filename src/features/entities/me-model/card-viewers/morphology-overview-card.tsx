import { useParams, useSearchParams } from 'next/navigation';
import { use, memo } from 'react';
import Link from 'next/link';

import CardContainer from '@/features/entities/me-model/card-viewers/card-container';
import {
  EmptyValue,
  renderArray,
  renderEmptyOrValue,
  renderLicense,
} from '@/entity-configuration/definitions/renderer';
import { renderPreview } from '@/constants/explore-section/fields-config/renderer';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { DataType } from '@/constants/explore-section/list-views';
import { classNames } from '@/util/utils';

import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
import type { Result } from '@/api/utils';

type Props = {
  mode: 'select' | 'summary';
  promise?: Promise<Result<IReconstructionMorphology, Error>> | IReconstructionMorphology;
  reselectLink?: boolean;
};

const title = 'M-Model';
const selectUrl = 'configure/morphology';

function MorphologyOverviewCard({ mode = 'summary', promise, reselectLink = false }: Props) {
  const searchParams = useSearchParams();
  let mmodel: IReconstructionMorphology | null = null;
  const params = useParams<{
    virtualLabId: string;
    projectId: string;
  }>();

  const getSelectUrlQueryParams = () => {
    const _params = new URLSearchParams(searchParams?.toString());
    _params.delete('m');
    return _params.toString();
  };

  if (promise) {
    if (promise instanceof Promise) {
      const { data, error } = use(promise);
      if (error) throw error;
      mmodel = data;
    } else {
      mmodel = promise;
    }

    const details = [
      { label: 'Brain Region', value: renderEmptyOrValue(mmodel.brain_region.name) },
      { label: 'Species', value: renderEmptyOrValue(mmodel.species.name) },
      {
        label: 'License',
        value: renderEmptyOrValue(renderLicense({ license: mmodel.license })),
      },
      {
        label: 'M-Type',
        value: renderEmptyOrValue(renderArray(mmodel.mtypes?.map((m) => m.pref_label) || [])),
      },
      { label: 'Age', value: EmptyValue },
    ];

    const exploreUrl = resolveExploreDetailsPageUrl({
      ctx: { ...(params ?? {}) },
      dataType: DataType.ExperimentalNeuronMorphology,
      entityId: mmodel.id,
    });

    return (
      <CardContainer
        mode={mode}
        model={mmodel}
        title={title}
        selectUrl={selectUrl}
        queryParams={getSelectUrlQueryParams()}
        exploreUrl={exploreUrl}
        modelDetails={details}
        reselectLink={reselectLink}
        thumbnail={renderPreview<IReconstructionMorphology>(
          {
            ...mmodel,
            // @ts-expect-error // TODO: need to the type form entitycore api
            type: EntityTypeEnum.ReconstructionMorphology,
          },
          { height: 200, width: 200 }
        )}
      />
    );
  }

  return (
    <Link
      href={{
        pathname: selectUrl,
        query: getSelectUrlQueryParams(),
      }}
      className={classNames(
        'border-neutral-2 text-neutral-4 hover:bg-primary-7 flex h-48 w-full',
        'items-center rounded-lg border pl-32 text-4xl hover:text-white'
      )}
    >
      Select {title.toLowerCase()}
    </Link>
  );
}

export default memo(MorphologyOverviewCard);
