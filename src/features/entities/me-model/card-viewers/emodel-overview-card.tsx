import { useParams, useSearchParams } from 'next/navigation';
import { use, memo } from 'react';
import Link from 'next/link';

import CardContainer from '@/features/entities/me-model/card-viewers/card-container';
import {
  EmptyValue,
  renderArray,
  renderEmptyOrValue,
  renderPreview,
} from '@/entity-configuration/definitions/renderer';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { DataType } from '@/constants/explore-section/list-views';
import { classNames } from '@/util/utils';

import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { Result } from '@/api/utils';

type Props = {
  mode: 'select' | 'summary';
  promise?: Promise<Result<IEModel, Error>> | IEModel;
  reselectLink?: boolean;
};

const title = 'E-Model';
const selectUrl = 'configure/e-model';

function EModelOverviewCard({ mode = 'summary', promise, reselectLink = false }: Props) {
  const searchParams = useSearchParams();
  let emodel: IEModel | null = null;

  const params = useParams<{
    virtualLabId?: string;
    projectId?: string;
  }>();

  const getSelectUrlQueryParams = () => {
    const _params = new URLSearchParams(searchParams?.toString());
    _params.delete('e');
    return _params.toString();
  };

  if (promise) {
    if (promise instanceof Promise) {
      const { data, error } = use(promise);
      if (error) throw error;
      emodel = data;
    } else {
      emodel = promise;
    }

    const exploreUrl = resolveExploreDetailsPageUrl({
      ctx: { ...(params ?? {}) },
      dataType: DataType.CircuitEModel,
      entityId: emodel.id,
    });

    const details = [
      { label: 'Exemplar morphology', value: renderEmptyOrValue(emodel.exemplar_morphology.name) },
      { label: 'Optimization target', value: EmptyValue },
      { label: 'Brain Region', value: renderEmptyOrValue(emodel.brain_region.name) },
      {
        label: 'E-Type',
        value: renderEmptyOrValue(renderArray(emodel.etypes?.map((m) => m.pref_label) || [])),
      },
    ];

    return (
      <CardContainer
        mode={mode}
        model={emodel}
        title={title}
        selectUrl={selectUrl}
        queryParams={getSelectUrlQueryParams()}
        exploreUrl={exploreUrl}
        modelDetails={details}
        thumbnail={
          renderPreview(
            // @ts-expect-error
            // TODO: need to the type form entitycore api
            // TODO: use the ephys here instead of the emodel
            { ...emodel, type: EntityTypeEnum.Emodel },
            { height: 200, width: 200 }
          )
          // selectedEModel && <EModelThumbnail emodel={selectedEModel} />
        }
        reselectLink={reselectLink}
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

export default memo(EModelOverviewCard);
// TODO: keep this one until migrate simulations
export function EModelThumbnail({ emodel }: { emodel: IEModel }) {
  // if (!emodel.image)
  //   return <Empty description="No thumbnail available" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  // return <EModelTracePreview images={emodel.image} height={200} width={200} />;
  return null;
}
