import Link from 'next/link';

import { renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { classNames } from '@/util/utils';

import type { ReactNode } from 'react';
import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';

import styles from './card-container.module.css';

const subtitleStyle = 'uppercase font-thin text-neutral-4';

type Detail = {
  label: string;
  value: string | ReactNode | undefined;
};

type ModelDetailsProps = {
  details: Detail[];
};

function ModelDetails({ details }: ModelDetailsProps) {
  return (
    <div className="text-primary-8 mt-4 grid grid-cols-3 gap-4">
      {details.map((detail) => (
        <div key={`${detail.label}-${detail.value?.toString()}`}>
          <div className={subtitleStyle}>{detail.label}</div>
          <div>{renderEmptyOrValue(detail.value)}</div>
        </div>
      ))}
    </div>
  );
}

type Props = {
  // @FIXME: Is this property used somewhere?
  // eslint-disable-next-line react/no-unused-prop-types
  mode: 'select' | 'summary';
  model: IEModel | ICellMorphology;
  title: string;
  selectUrl: string;
  queryParams: string;
  exploreUrl: string;
  modelDetails: Detail[];
  thumbnail: ReactNode;
  reselectLink?: boolean;
};

export default function ModelCard({
  model,
  title,
  selectUrl,
  queryParams,
  exploreUrl,
  modelDetails,
  thumbnail,
  reselectLink = false,
}: Props) {
  const cardLink = reselectLink ? (
    <Link
      href={{
        pathname: selectUrl,
        query: queryParams,
      }}
      className="text-primary-8 font-bold"
    >
      Select a different {title.toLowerCase()}
    </Link>
  ) : (
    <Link href={exploreUrl} target="_blank" className="text-primary-8 font-bold">
      More details
    </Link>
  );

  return (
    <div className={styles.cardContainer}>
      <div className="flex justify-between">
        <div className={classNames('text-2xl', subtitleStyle)}>{title}</div>
        {cardLink}
      </div>

      <div className="mt-2 flex gap-10">
        <div
          className="border-neutral-2 m-0 flex flex-col items-center justify-center border"
          style={{ height: 202, width: 202 }}
        >
          {thumbnail}
        </div>
        <div className="grow">
          <div className={subtitleStyle}>NAME</div>
          <div className={styles.name}>{model.name}</div>
          <ModelDetails details={modelDetails} />
        </div>
      </div>
    </div>
  );
}
