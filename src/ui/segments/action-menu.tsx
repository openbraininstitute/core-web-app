'use client';

import {
  CheckOutlined,
  CopyOutlined,
  DownloadOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useAtom } from 'jotai';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { useState } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { config } from '@/config';
import type { EntityTypeValue } from '@/entity-configuration/domain';
import {
  type EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';
import { downloadArchive } from '@/services/entity-download';
import Action from '@/ui/molecules/side-menu-action';
import { downloadPanelCircuitAtom } from '@/ui/segments/explore/circuit/elements/download-panel';
import {
  PanelQueryParam,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';

export default function ActionMenu({
  entity,
  ctx,
  type,
}: {
  entity: EntityTypeValue;
  ctx: { virtualLabId: string; projectId: string };
  type: EntityCoreExtendedType;
}) {
  const [copied, setCopied] = useState(false);
  const [, setCircuit] = useAtom(downloadPanelCircuitAtom);

  const entityType = getEntityByExtendedType({ type });
  if (!entityType) notFound();

  const isSimulatable =
    typeof entityType.isSimulatable === 'boolean'
      ? entityType.isSimulatable
      : 'scale' in entity && entityType.isSimulatable(entity.scale);

  return (
    <div className="text-primary-9 mt-10 flex flex-col gap-5 px-5 text-base font-bold">
      <Action
        icon={
          !copied ? (
            <CopyOutlined
              onClick={() => {
                if (copied) return;
                setCopied(true);
                navigator.clipboard.writeText(entity.id);
                window.setTimeout(() => setCopied(false), 5000);
              }}
            />
          ) : (
            <CheckOutlined className="text-teal-400" />
          )
        }
      >
        {copied ? 'Copied' : 'Copy ID'}
      </Action>
      {isSimulatable && (
        <Action
          icon={
            <NextLink
              href={{
                pathname: `${config.ROOT_ROUTE}/${ctx.virtualLabId}/${ctx.projectId}/workflows/simulate/configure/${entityType.type.replaceAll('_', '-')}/${entity.id}`,
                query: {
                  sessionId: crypto.randomUUID(),
                  [PanelQueryParam]: WorkflowSimulatePanels.Configuration,
                },
              }}
            >
              <ExperimentOutlined />
            </NextLink>
          }
        >
          Simulate
        </Action>
      )}
      {entityType.isDownloadable && (
        <Action
          icon={
            <DownloadOutlined
              onClick={() => {
                if (entity.type === 'circuit') setCircuit(entity as ICircuit);
                else {
                  downloadArchive(entityType.type, [entity.id], ctx);
                }
              }}
            />
          }
        >
          Download
        </Action>
      )}
    </div>
  );
}
