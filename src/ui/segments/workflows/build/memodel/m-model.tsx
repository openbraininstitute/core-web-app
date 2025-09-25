'use client';

import { ReloadOutlined } from '@ant-design/icons';
import { Image } from 'antd';
import kebabCase from 'lodash/kebabCase';

import { useRouter } from 'next/navigation';
import { label, useBuildMeModelSessionState } from '@/ui/segments/workflows/build/memodel/helpers';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  renderArray,
  renderDate,
  renderEmptyOrValue,
  renderLicense,
  renderPreview,
} from '@/entity-configuration/definitions/renderer';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';
import { ROOT_ROUTE } from '@/config';

import { EntityTypeDict, type ICellMorphology } from '@/api/entitycore/types';

type Props = {
  sessionId: string;
};

export function MModel({ sessionId }: Props) {
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
      id={sessionId}
      section={WorkspaceSection.BuildWorkflow}
      requireMiniDetailView={false}
      classNames={{ container: 'max-h-full' }}
      dataType={ExtendedEntitiesTypeDict.CellMorphology}
      scope={WorkspaceScope.BuildMeModelM}
      miniViewProps={{ section: WorkspaceSection.BuildWorkflow }}
      allowDownload={false}
      mainTableProps={{
        selectionType: 'radio',
        onCellClick: (_, record) => {
          navigate(
            `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(EntityTypeDict.CellMorphology)}/${record.id}/overview`
          );
        },
        onRowsSelected: (rows) => {
          const record = rows.at(0);
          setSessionValue({
            ...sessionValue,
            mmodel: record as unknown as ICellMorphology,
          });
        },
      }}
    />
  );
}

export function MModelMiniDetail({ sessionId }: { sessionId: string }) {
  const { virtualLabId, projectId } = useWorkspace();

  const { setSessionValue, sessionValue } = useBuildMeModelSessionState({
    sessionId,
    virtualLabId,
    projectId,
  });
  const data = sessionValue.mmodel;

  const details = [
    { label: 'Name', value: renderEmptyOrValue(data?.name), className: 'font-bold' },
    { label: 'Description', value: renderEmptyOrValue(data?.description) },
    { label: 'Brain Region', value: renderEmptyOrValue(data?.brain_region.name) },
    { label: 'Species', value: renderEmptyOrValue(data?.subject.species.name) },
    {
      label: 'M-Type',
      value: renderEmptyOrValue(renderArray(data?.mtypes?.map((m) => m.pref_label) || [])),
    },
    {
      label: 'License',
      value: renderEmptyOrValue(renderLicense({ license: data?.license })),
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

  const onReset = () => setSessionValue({ ...sessionValue, mmodel: undefined });

  return (
    <div className="grid h-full w-full grid-cols-2 flex-col items-start gap-4">
      <div className="flex w-full flex-col items-center justify-center px-4">
        <div className="mb-4 flex w-full items-center justify-between gap-2 select-none">
          <h3 className="text-neutral-4 text-lg font-medium uppercase">M-Model</h3>
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
