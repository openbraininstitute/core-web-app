import { ConfigProvider, Table } from 'antd';
import { get, lowerCase, upperFirst } from 'es-toolkit/compat';

import { ActivityStatus } from '@/api/entitycore/types/entities/task-activity';
import { ExecutionStatus } from '@/features/task/activity-execution/status';

import type { ColumnsType } from 'antd/es/table';
import type { SVGProps } from 'react';
import type { ListExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/types';
import type {
  TTaskCampaignExecutionRow,
  TTaskCampaignRow,
} from '@/entity-configuration/domain/task-helpers';

export function getParamLabel(param: string) {
  return upperFirst(lowerCase(param.split('.').at(-1))); // e.g. "initialize.random_seed" -> "Random seed"
}

export function getParamTitle(param: string) {
  const parts = param.split('.');
  return (
    <div className="flex items-start flex-col gap-1">
      {parts.map((part) => (
        <span
          className="text-sm leading-3 first-of-type:font-bold text-primary-9"
          key={part.toLocaleLowerCase()}
        >
          {upperFirst(lowerCase(part))}
        </span>
      ))}
    </div>
  );
}

/** API may return scan params as a string[], object map, or omit them. */
export function scanParameterKeys(scanParameters: unknown): string[] {
  if (scanParameters == null) return [];
  if (Array.isArray(scanParameters)) {
    return scanParameters.filter((x): x is string => typeof x === 'string');
  }
  if (typeof scanParameters === 'object') {
    return Object.keys(scanParameters as Record<string, unknown>);
  }
  return [];
}

const className = 'text-primary-9! whitespace-nowrap';

type Row = {
  id: string;
  name: string;
  scan_parameters: Record<string, unknown>;
  status: ActivityStatus;
};

function getExecutionStatus(
  record: TTaskCampaignExecutionRow<{ scan_parameters: Record<string, unknown> }>
) {
  return record.execution?.status ?? ActivityStatus.CREATED;
}

export function AddCircleLineDuotone(props: SVGProps<SVGSVGElement>) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: <explanation>
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      {/* Icon from Solar by 480 Design - https://creativecommons.org/licenses/by/4.0/ */}
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" opacity=".5" />
        <path strokeLinecap="round" d="M15 12h-3m0 0H9m3 0V9m0 3v3" />
      </g>
    </svg>
  );
}

export function MinusCircleLineDuotone(props: SVGProps<SVGSVGElement>) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: <explanation>
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      {/* Icon from Solar by 480 Design - https://creativecommons.org/licenses/by/4.0/ */}
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" opacity=".5" />
        <path strokeLinecap="round" d="M15 12H9" />
      </g>
    </svg>
  );
}

export const TaskViewConfig: ListExpandedViewConfig<
  TTaskCampaignRow<{ scan_parameters: Record<string, unknown> }>
> = {
  expandIconColumnIndex: 5,
  render: (taskCampaignRow, records) => {
    const taskRows =
      records.length > 0
        ? (records as unknown as TTaskCampaignExecutionRow<{
            scan_parameters: Record<string, unknown>;
          }>[])
        : taskCampaignRow.rows;
    const campaignMeta = taskCampaignRow.meta as Record<string, unknown>;
    const paramKeySet = new Set<string>([
      ...scanParameterKeys(campaignMeta.scan_parameters),
      ...taskRows.flatMap((r) =>
        scanParameterKeys(
          get(r.provenance.config.meta as Record<string, unknown>, 'scan_parameters')
        )
      ),
    ]);

    const extraColumns: ColumnsType<Row> = [...paramKeySet].map((param) => ({
      title: <span title={param}>{getParamTitle(param)}</span>,
      className,
      dataIndex: ['scan_parameters', param],
      ellipsis: true,
      key: param,
    }));

    const rows: Row[] = taskRows.map((r) => ({
      id: `${r.provenance.config.id}:${r.execution?.id ?? 'pending'}`,
      name: r.provenance.config.name,
      scan_parameters:
        (get(r.provenance.config.meta as Record<string, unknown>, 'scan_parameters') as
          | Record<string, unknown>
          | undefined) ?? {},
      status: getExecutionStatus(r),
    }));

    const columns: ColumnsType<Row> = [
      {
        title: <span className={className}>Name</span>,
        className,
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        fixed: 'left' as const,
      },
      ...extraColumns,
      {
        title: <span className={className}>Status</span>,
        render: (r: Row) => (
          <div className="flex items-center justify-center">
            <ExecutionStatus status={r.status} />
          </div>
        ),
        width: 200,
        align: 'center',
        className,
        key: 'status',
      },
    ];

    return (
      <div className="pr-36 pl-12">
        <ConfigProvider theme={{ hashed: false }}>
          <Table
            size="middle"
            bordered
            columns={columns}
            dataSource={rows}
            rowKey="id"
            pagination={false}
            className="[&_.ant-table-cell]:bg-background! [&_.ant-table-thead>th]:text-primary-9! [&_.ant-table-row:hover>td]:bg-gray-100!"
          />
        </ConfigProvider>
      </div>
    );
  },
  expandIcon: (props) => {
    if (!props.expandable) return null;
    if (props.expanded) {
      return (
        <button
          id={`task-view-collapse-icon-${props.record.id}`}
          type="button"
          onClick={(e) => props.onExpand(props.record, e)}
        >
          <MinusCircleLineDuotone className="text-primary-8 size-6" />
        </button>
      );
    }
    return (
      <button
        id={`task-view-expand-icon-${props.record.id}`}
        type="button"
        onClick={(e) => props.onExpand(props.record, e)}
      >
        <AddCircleLineDuotone className="text-primary-7 size-6" />
      </button>
    );
  },
  isExpandable: () => true,
};
