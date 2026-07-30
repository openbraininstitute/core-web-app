import { get, lowerCase, upperFirst } from 'es-toolkit/compat';

import { ActivityStatus } from '@/api/entitycore/types/entities/task-activity';
import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { ActivityStatusRenderer } from '@/features/task-runner/activity-execution/status';

import type { ReactNode, SVGProps } from 'react';
import type { ListExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/types';
import type {
  TTaskCampaignExecutionRow,
  TTaskCampaignRow,
} from '@/entity-configuration/domain/task-functions';
import type { CellValue } from '@/features/data-grid/core';
import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';

export function getParamLabel(param: string) {
  // e.g. "initialize.random_seed" -> "Random seed"
  return upperFirst(lowerCase(param.split('.').at(-1)));
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

const headerWrapClassName = 'text-primary-9! whitespace-normal break-words';
const expandedTableWrapperClassName = 'pr-36 pl-12';

type ScanParamsRow = {
  id: string;
  name: string;
  scan_parameters: Record<string, unknown>;
};

export function createScanParameterColumns<R extends ScanParamsRow>(
  paramKeys: Iterable<string>
): Array<SimpleColumn<R>> {
  return Array.from(paramKeys).map((param) => ({
    id: param,
    header: getParamLabel(param),
    headerNode: (
      <div title={param} className={headerWrapClassName}>
        {getParamTitle(param)}
      </div>
    ),
    getValue: (row: R) => get(row, ['scan_parameters', param]) as CellValue,
  }));
}

export function createNameColumn<R extends ScanParamsRow>(): SimpleColumn<R> {
  return {
    id: 'name',
    header: 'Name',
    field: 'name',
    width: { width: 200 },
    pinned: 'left',
  };
}

export function createStatusColumn<R>(
  renderStatus: (_: unknown, record: R) => ReactNode,
  opts?: { width?: number }
): SimpleColumn<R> {
  return {
    id: 'status',
    header: 'Status',
    renderCell: (record: R) => renderStatus(undefined, record),
    width: { width: opts?.width ?? 120 },
    align: 'center',
    pinned: 'right',
  };
}

export function renderExpandedTable<R extends { id: string }>(props: {
  columns: Array<SimpleColumn<R>>;
  dataSource: R[];
  rowKey?: string | ((record: R) => string);
}) {
  const { rowKey } = props;
  const getRowId =
    typeof rowKey === 'function'
      ? rowKey
      : (record: R) => String((record as Record<string, unknown>)[rowKey ?? 'id']);

  return (
    <div className={expandedTableWrapperClassName}>
      <SimpleGrid columns={props.columns} rows={props.dataSource} getRowId={getRowId} />
    </div>
  );
}

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
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon
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
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon
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

    const extraColumns = createScanParameterColumns<Row>(paramKeySet);

    const rows: Row[] = taskRows.map((r) => ({
      id: `${r.provenance.config.id}:${r.execution?.id ?? 'pending'}`,
      name: r.provenance.config.name,
      scan_parameters:
        (get(r.provenance.config.meta as Record<string, unknown>, 'scan_parameters') as
          | Record<string, unknown>
          | undefined) ?? {},
      status: getExecutionStatus(r),
    }));

    const columns: Array<SimpleColumn<Row>> = [
      createNameColumn<Row>(),
      ...extraColumns,
      createStatusColumn<Row>((_: unknown, r: Row) => (
        <div className="flex items-center justify-center">
          <ActivityStatusRenderer status={r.status} />
        </div>
      )),
    ];

    return renderExpandedTable<Row>({ columns, dataSource: rows });
  },
  expandIcon: (props) => {
    if (!props.expandable) return null;
    if (props.expanded) {
      return (
        <button
          id={`task-view-collapse-icon-${props.record.id}`}
          type="button"
          onClick={(e) => props.onExpand(props.record, e)}
          className="mt-2"
        >
          <MinusCircleLineDuotone className="text-primary-8 size-5" />
        </button>
      );
    }
    return (
      <button
        id={`task-view-expand-icon-${props.record.id}`}
        type="button"
        className="mt-2"
        onClick={(e) => props.onExpand(props.record, e)}
      >
        <AddCircleLineDuotone className="text-primary-7 size-5" />
      </button>
    );
  },
  isExpandable: () => true,
};
