'use client';

import { ReloadOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { Image } from 'antd';
import kebabCase from 'lodash/kebabCase';

import type { HTMLAttributes, TdHTMLAttributes } from 'react';

import { useBuildMeModelSessionState, label } from '@/ui/segments/workflows/build/memodel/helpers';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { ROOT_ROUTE } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  renderArray,
  renderDate,
  renderEmptyOrValue,
  renderPreview,
} from '@/entity-configuration/definitions/renderer';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import { EntityTypeDict, type IEModel } from '@/api/entitycore/types';

type Props = {
  sessionId: string;
};

export const EmodelBlackList = [
  'EM__CBXgr_GrC_cNAC',
  'EM__CBXmo_StC_cNAC',
  'EM__CBXpu_PuC_cNAC',
  'EM__CBXgr_GoC_cAC',
  'EM__MOBmi_MC_cNAC',
  'EM__MOBgr_sGC_dNAC',
];

function checkSelectedEmodelBlackList(e: IEModel) {
  return EmodelBlackList.includes(e.name);
}

export function EModel({ sessionId }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const { push: navigate } = useRouter();
  const { setSessionValue, sessionValue } = useBuildMeModelSessionState({
    sessionId,
    virtualLabId,
    projectId,
  });

  return (
    <BrowseEntityScope
      requireBrainRegion
      allowDownload={false}
      id={sessionId}
      section={WorkspaceSection.BuildWorkflow}
      requireMiniDetailView={false}
      classNames={{ container: 'max-h-full' }}
      dataType={ExtendedEntitiesTypeDict.Emodel}
      scope={WorkspaceScope.BuildMeModelE}
      miniViewProps={{ section: WorkspaceSection.BuildWorkflow }}
      mainTableProps={{
        selectionType: 'radio',
        onCellClick: (_, record) => {
          navigate(
            `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(EntityTypeDict.Emodel)}/${record.id}/overview`
          );
        },
        onRowsSelected: (rows) => {
          const record = rows.at(0);
          setSessionValue({
            ...sessionValue,
            emodel: record as unknown as IEModel,
          });
        },
        onRow: (row) => {
          if (checkSelectedEmodelBlackList(row as IEModel))
            // this new line in the attribute is required to be displayed in two lines
            return {
              'black-listed': `This e-model cannot be combined 
              with any morphology for now.
              `,
            } as HTMLAttributes<any> & TdHTMLAttributes<any>;
          return {};
        },
        // eslint-disable-next-line
        rowClassName: (row) => {
          return checkSelectedEmodelBlackList(row as IEModel)
            ? cn(
                'bg-gray-200 [&_td]:bg-gray-200! hover:[bg-gray-200] [&:hover_td]:bg-gray-200',
                '[&_.ant-radio-input]:pointer-events-none [&_.ant-radio-wrapper]:pointer-events-none [&_.ant-radio]:pointer-events-none [&_.ant-radio-input]:pointer-events-none',
                '[&_.ant-radio-input]:cursor-not-allowed [&_.ant-radio-wrapper]:cursor-not-allowed',
                '[&_.ant-table-cell]:cursor-not-allowed',
                `
                  [tr:has(.ant-radio-wrapper)]:relative!
                  [tr:has(.ant-radio-wrapper)]:hover:after:content-[attr(black-listed)]!
                  [tr:has(.ant-radio-wrapper)]:hover:after:absolute
                  [tr:has(.ant-radio-wrapper)]:hover:after:bg-yellow-100
                  [tr:has(.ant-radio-wrapper)]:hover:after:backdrop-blur-xl
                  [tr:has(.ant-radio-wrapper)]:hover:after:border
                  [tr:has(.ant-radio-wrapper)]:hover:after:border-yellow-100/20
                  [tr:has(.ant-radio-wrapper)]:hover:after:shadow-lg
                  [tr:has(.ant-radio-wrapper)]:hover:after:text-primary-8
                  [tr:has(.ant-radio-wrapper)]:hover:after:text-sm
                  [tr:has(.ant-radio-wrapper)]:hover:after:px-2
                  [tr:has(.ant-radio-wrapper)]:hover:after:py-1
                  [tr:has(.ant-radio-wrapper)]:hover:after:rounded
                  [tr:has(.ant-radio-wrapper)]:hover:after:whitespace-pre-line
                  [tr:has(.ant-radio-wrapper)]:hover:after:z-50
                  [tr:has(.ant-radio-wrapper)]:hover:after:top-[10px]
                  [tr:has(.ant-radio-wrapper)]:hover:after:left-[10px]
                `
              )
            : '';
        },
      }}
    />
  );
}

export function EModelMiniDetail({ sessionId }: Props) {
  const { virtualLabId, projectId } = useWorkspace();

  const { setSessionValue, sessionValue } = useBuildMeModelSessionState({
    sessionId,
    virtualLabId,
    projectId,
  });
  const data = sessionValue.emodel;
  const details = [
    { label: 'Name', value: renderEmptyOrValue(data?.name), className: 'font-bold' },
    { label: 'Exemplar morphology', value: renderEmptyOrValue(data?.exemplar_morphology.name) },
    { label: 'Brain Region', value: renderEmptyOrValue(data?.brain_region.name) },
    { label: 'Species', value: renderEmptyOrValue(data?.species.name) },
    {
      label: 'E-Type',
      value: renderEmptyOrValue(renderArray(data?.etypes?.map((m) => m.pref_label) || [])),
    },
    {
      label: 'Created By',
      value: renderEmptyOrValue(data?.created_by?.pref_label),
    },
    {
      label: 'Created At',
      value: renderDate(data?.creation_date),
    },
  ];

  const content = details.map(({ value, label: text, className }) => {
    return (
      <div key={`item-${label}`} className="flex w-full flex-col items-start justify-start">
        {label(text!, 'secondary')}
        <div className={cn('text-primary-9 font-light', className)}>{value}</div>
      </div>
    );
  });

  const onReset = () => setSessionValue({ ...sessionValue, emodel: undefined });

  return (
    <div className="grid h-full w-full grid-cols-2 flex-col items-start gap-4">
      <div className="flex w-full flex-col items-center justify-center px-4">
        <div className="mb-4 flex w-full items-center justify-between gap-2 select-none">
          <h3 className="text-neutral-4 text-lg font-medium uppercase">E-Model</h3>
          <Button
            rounded
            className="text-primary-9 group flex items-center justify-center gap-2 rounded-full bg-white/40 pr-1 pl-3 shadow-xs hover:bg-white"
            variant="ghost"
            onClick={onReset}
          >
            <div className="flex items-center justify-center gap-1.5">
              Select another model
              <div className="flex h-8 w-8 items-center justify-center rounded-full group-hover:bg-white">
                <ReloadOutlined />
              </div>
            </div>
          </Button>
        </div>
        <div className="flex w-full flex-col items-start justify-center gap-5">{content}</div>
      </div>
      <div className="h-full w-full rounded-2xl bg-white">
        {renderPreview(
          data as unknown as EntityCoreResource,
          undefined,
          undefined,
          'rounded-2xl h-full relative w-full!',
          'w-full! h-full! flex!',
          true,
          (src) => (
            <Image
              alt={`${data?.name} preview`}
              src={src}
              rootClassName=" w-full h-full flex items-center! justify-center! [&_.ant-image-mask]:rounded-2xl"
              className="max-h-full w-full rounded-2xl object-contain"
            />
          )
        )}
      </div>
    </div>
  );
}
