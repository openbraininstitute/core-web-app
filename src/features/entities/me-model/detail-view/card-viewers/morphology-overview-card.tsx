import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import React from 'react';
import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  EmptyValue,
  renderArray,
  renderEmptyOrValue,
  renderLicense,
  renderPreview,
} from '@/entity-configuration/definitions/renderer';
import CardContainer from '@/features/entities/me-model/detail-view/card-viewers/card-container';
import { classNames } from '@/util/utils';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

type Props = {
  mode: 'select' | 'summary';
  data?: ICellMorphology | ICellMorphology;
  reselectLink?: boolean;
};

const title = 'M-Model';
const selectUrl = 'configure/morphology';

function MorphologyOverviewCard({ mode = 'summary', data, reselectLink = false }: Props) {
  const searchParams = useSearchParams();
  const params = useParams<{
    virtualLabId: string;
    projectId: string;
  }>();

  const getSelectUrlQueryParams = () => {
    const urlSearchParams = new URLSearchParams(searchParams?.toString());
    urlSearchParams.delete('m');
    return urlSearchParams.toString();
  };

  if (data) {
    const details = [
      {
        label: 'Brain Region',
        value: renderEmptyOrValue(data.brain_region.name),
      },
      {
        label: 'Species',
        value: renderEmptyOrValue(data.subject.species.name),
      },
      {
        label: 'License',
        value: renderEmptyOrValue(renderLicense({ license: data.license })),
      },
      {
        label: 'M-Type',
        value: renderEmptyOrValue(renderArray(data.mtypes?.map((m) => m.pref_label) || [])),
      },
      { label: 'Age', value: EmptyValue },
    ];

    const exploreUrl = resolveExploreDetailsPageUrl({
      ctx: { ...(params ?? {}) },
      dataType: ExtendedEntitiesTypeDict.CellMorphology,
      entityId: data.id,
    });

    return (
      <CardContainer
        mode={mode}
        model={data}
        title={title}
        selectUrl={selectUrl}
        queryParams={getSelectUrlQueryParams()}
        exploreUrl={exploreUrl}
        modelDetails={details}
        reselectLink={reselectLink}
        thumbnail={renderPreview<ICellMorphology>(data, {
          height: 200,
          width: 200,
        })}
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
        'items-center rounded-lg border pl-32 text-4xl hover:text-white',
      )}
    >
      Select {title.toLowerCase()}
    </Link>
  );
}

export default React.memo(MorphologyOverviewCard);
