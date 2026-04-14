import { RiAddCircleLine, RiIndeterminateCircleLine } from '@remixicon/react';
import { ConfigProvider, Table } from 'antd';
import { get, lowerCase, upperFirst } from 'es-toolkit/compat';

import { ActivityStatus } from '@/api/entitycore/types/entities/task-activity';
import { ExecutionStatus } from '@/ui/segments/activity-execution/status';

import type { ColumnsType } from 'antd/es/table';
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
  /* return upperFirst(lowerCase(param.split('.').at(-1))); // e.g. "initialize.random_seed" -> "Random seed" */
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

export const TaskViewConfig: ListExpandedViewConfig<
  TTaskCampaignRow<{ scan_parameters: Record<string, unknown> }>
> = {
  expandIconColumnIndex: 5,
  render: (taskCampaignRow) => {
    const campaignMeta = taskCampaignRow.meta as Record<string, unknown>;
    const paramKeySet = new Set<string>([
      ...scanParameterKeys(campaignMeta.scan_parameters),
      ...taskCampaignRow.rows.flatMap((r) =>
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

    const rows: Row[] = taskCampaignRow.rows.map((r) => ({
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
        fixed: 'right',
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
        <button type="button" onClick={(e) => props.onExpand(props.record, e)}>
          <RiIndeterminateCircleLine className="text-primary-8 size-6" />
        </button>
      );
    } else {
      return (
        <button type="button" onClick={(e) => props.onExpand(props.record, e)}>
          <RiAddCircleLine className="text-primary-7 size-6" />
        </button>
      );
    }
  },
  isExpandable: (taskCampaignRow) => get(taskCampaignRow, 'rows', []).length > 0,
};
