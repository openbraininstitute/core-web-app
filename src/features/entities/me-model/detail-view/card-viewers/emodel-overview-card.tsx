import { useParams, useSearchParams } from 'next/navigation';
import { memo } from 'react';
import Link from 'next/link';

import CardContainer from '@/features/entities/me-model/detail-view/card-viewers/card-container';
import {
  EmptyValue,
  renderArray,
  renderEmptyOrValue,
  renderPreview,
} from '@/entity-configuration/definitions/renderer';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { classNames } from '@/util/utils';
import {
  detailViewCardBorderClass,
  type DetailViewVariant,
} from '@/ui/segments/detail-view/variant-styles';

import type { IEModel } from '@/api/entitycore/types/entities/e-model';

type Props = {
  mode: 'select' | 'summary';
  data?: IEModel;
  reselectLink?: boolean;
  variant?: DetailViewVariant;
};

const title = 'E-Model';
const selectUrl = 'configure/e-model';

function EModelOverviewCard({
  mode = 'summary',
  data,
  reselectLink = false,
  variant = 'light',
}: Props) {
  const searchParams = useSearchParams();

  const params = useParams<{
    virtualLabId?: string;
    projectId?: string;
  }>();

  const getSelectUrlQueryParams = () => {
    const urlSearchParams = new URLSearchParams(searchParams?.toString());
    urlSearchParams.delete('e');
    return urlSearchParams.toString();
  };

  if (data) {
    const exploreUrl = resolveExploreDetailsPageUrl({
      ctx: { ...(params ?? {}) },
      dataType: ExtendedEntitiesTypeDict.Emodel,
      entityId: data.id,
    });

    const details = [
      { label: 'Exemplar morphology', value: renderEmptyOrValue(data.exemplar_morphology.name) },
      { label: 'Optimization target', value: EmptyValue },
      { label: 'Brain Region', value: renderEmptyOrValue(data.brain_region.name) },
      {
        label: 'E-Type',
        value: renderEmptyOrValue(renderArray(data.etypes?.map((m) => m.pref_label) || [])),
      },
    ];

    return (
      <CardContainer
        mode={mode}
        model={data}
        title={title}
        selectUrl={selectUrl}
        queryParams={getSelectUrlQueryParams()}
        exploreUrl={exploreUrl}
        modelDetails={details}
        thumbnail={
          renderPreview(
            // TODO: use renderImage (emodel has a thumbnail image in `image`)
            data,
            { height: 200, width: 200 }
          )
          // selectedEModel && <EModelThumbnail emodel={selectedEModel} />
        }
        reselectLink={reselectLink}
        variant={variant}
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
        'flex h-48 w-full items-center rounded-lg border pl-32 text-4xl',
        detailViewCardBorderClass(variant),
        variant === 'onPrimary'
          ? 'text-primary-2 hover:bg-primary-8 hover:text-white'
          : 'border-neutral-2 text-neutral-4 hover:bg-primary-7 hover:text-white'
      )}
    >
      Select {title.toLowerCase()}
    </Link>
  );
}

export default memo(EModelOverviewCard);

// TODO: keep this one until migrate simulations
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function EModelThumbnail({ emodel }: { emodel: IEModel }) {
  // if (!emodel.image)
  //   return <Empty description="No thumbnail available" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  // return <EModelTracePreview images={emodel.image} height={200} width={200} />;
  return null;
}
