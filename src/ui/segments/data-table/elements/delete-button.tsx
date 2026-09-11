'use client';

import { DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Popconfirm } from 'antd';
import { compact, get, groupBy } from 'es-toolkit/compat';
import { AnimatePresence, motion } from 'motion/react';
import pMap from 'p-map';
import { type ReactNode, useMemo } from 'react';

import { useAppNotification } from '@/components/notification';
import { WorkspaceScope } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { invalidateEntityListings } from '@/features/data-grid/listing-queries';
// direct module import: the react barrel would close a module-init cycle via the grid host
import {
  EXPANDING_PILL_BASE_CLASS,
  ExpandingPillContent,
} from '@/features/data-grid/react/expanding-toolbar-button';
import { useScope } from '@/ui/hooks/use-scope';
import { Badge } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { IconType } from 'antd/es/notification/interface';
import type {
  EntityCoreIdentifiable,
  EntityCoreIdentifiableNamed,
} from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';
import type { RenderButtonProps } from '@/ui/segments/data-table/elements/bulk-action-props';

type DeletionResult = {
  success: Array<
    | {
        id: string;
        name: string;
        deleted: boolean;
        error?: undefined;
      }
    | {
        id: string;
        name: string;
        deleted: boolean;
        error: unknown;
      }
  >;
  errors: Record<
    string,
    Array<
      | {
          id: string;
          name: string;
          deleted: boolean;
          error?: undefined;
        }
      | {
          id: string;
          name: string;
          deleted: boolean;
          error: unknown;
        }
    >
  >;
};

function buildBulkDeleteNotification(result: DeletionResult): {
  message: string;
  description: ReactNode;
  type: IconType;
} {
  const success = result.success.length;
  const fk = result.errors.foreignKeyViolation?.length ?? 0;
  const other = result.errors?.other?.length ?? 0;

  if (success && !fk && !other) {
    return {
      message: 'Deleted successfully',
      description: `${success} items have been removed.`,
      type: 'success',
    };
  }
  if (!success && !other && fk) {
    return {
      message: 'Deletion blocked by referencing records',
      description: `${fk} ${fk > 1 ? 'entities are' : 'entity is'}  referenced by other record(s) and cannot be deleted.`,
      type: 'error',
    };
  }
  if (!success && (fk || other)) {
    return {
      message: 'No items were deleted',
      description: 'They are either referenced by other records or failed during deletion.',
      type: 'error',
    };
  }
  if (success && (fk || other)) {
    return {
      message: 'Some items couldn’t be deleted',
      description: (
        <ul className="list-disc flex items-start justify-start flex-col">
          <li className="flex items-start justify-center gap-1.5">
            <strong className="font-bold text-teal-400">{success}</strong>
            <span className="text-primary-8">successfully removed</span>
          </li>
          <li className="flex items-start justify-center gap-1.5">
            <strong className="font-bold text-destructive">{fk}</strong>
            <span className="text-primary-8">
              {fk > 0 ? 'entities are' : 'entity is'} referenced by other record(s) and cannot be
              deleted.
            </span>
          </li>
          <li className="flex items-start justify-center gap-1.5">
            <strong className="font-bold text-destructive">{other}</strong>
            <span className="text-primary-8">failed during deletion</span>
          </li>
        </ul>
      ),
      type: 'warning',
    };
  }

  return {
    type: 'warning',
    message: 'Partial deletion completed',
    description: `${success} removed • ${fk} blocked • ${other} failed.`,
  };
}

export function EntityDeleteButton<T extends EntityCoreIdentifiable>({
  children,
  selectedRows,
  dataType,
  workspace,
  clearSelectedRows,
  selectionCount,
  className,
  expanding = false,
}: RenderButtonProps<T> & {
  children?: ReactNode;
  workspace?: WorkspaceContext;
  className?: string;
  /** Render as the grid's expanding pill (icon at rest, label on hover/focus-visible). */
  expanding?: boolean;
}) {
  const notify = useAppNotification();
  const queryClient = useQueryClient();
  const { scope: currentScope } = useScope();

  const projectRows = selectedRows.filter((row) => {
    const candidate = row as T & {
      authorized_project_id?: string | null;
      authorized_public?: boolean;
    };
    return (
      candidate.authorized_public === false &&
      candidate.authorized_project_id === workspace?.projectId
    );
  });
  const entityCount = projectRows.length;
  const badgeCount = selectionCount ?? entityCount;
  const isSingular = entityCount === 1;
  const selectionBadge =
    badgeCount > 0 ? (
      <Badge
        rounded
        aria-label={`${badgeCount} project items selected`}
        className="h-5 min-w-5 border-2 border-white bg-white px-1 text-[11px] font-bold leading-none text-destructive shadow-sm"
      >
        {badgeCount}
      </Badge>
    ) : undefined;
  const label = isSingular ? '1 item selected' : `${entityCount} items selected`;

  const getButtonLabel = (): string => {
    return isSingular ? `Delete entity` : `Delete entities`;
  };

  const entityTypeConfig = getEntityByExtendedType({ type: dataType });

  const permissions = useMemo(() => {
    const isProjectScope = currentScope === WorkspaceScope.Project;
    return {
      delete:
        !!entityTypeConfig?.isDeletable && isProjectScope && !!entityTypeConfig.api.query.delete,
    };
  }, [currentScope, entityTypeConfig]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!workspace) throw new Error('No workspace context found');
      const rows = compact(projectRows) as unknown as EntityCoreIdentifiableNamed[];
      return await pMap(
        rows,
        async (row) => {
          try {
            await entityTypeConfig?.api.query.delete?.({
              id: row.id,
              context: workspace,
            });

            return {
              id: row.id,
              name: row.name,
              deleted: true,
            };
          } catch (error) {
            return {
              id: row.id,
              name: row.name,
              deleted: false,
              error,
            };
          }
        },
        {
          concurrency: 5,
          stopOnError: false,
        }
      );
    },
    onSuccess: async (resp) => {
      invalidateEntityListings(queryClient, dataType);

      const message = buildBulkDeleteNotification({
        success: resp.filter((e) => e.deleted),
        errors: groupBy(
          resp.filter((e) => !e.deleted),
          (e) => {
            const message = get(e.error, 'cause.message', '');
            if (message?.includes('foreign keys integrity violation')) {
              return 'foreignKeyViolation';
            }
            return 'other';
          }
        ),
      });

      notify.open({
        message: message?.message,
        description: message?.description,
        type: message.type,
        placement: 'topRight',
      });

      if (clearSelectedRows) clearSelectedRows();
    },
  });

  const renderButtonIcon = () => {
    return (
      <AnimatePresence mode="wait">
        {deleteMutation.isPending ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <LoadingOutlined spin className="text-lg" />
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <DeleteOutlined className="text-lg" />
          </motion.span>
        )}
      </AnimatePresence>
    );
  };

  if (!permissions.delete) return null;

  const buttonLabel = getButtonLabel();
  /** gradient + chrome marking this as destructive */
  const destructivePalette = cn(
    'border border-white/20 font-semibold text-white',
    'bg-linear-to-r from-destructive via-destructive/80 to-destructive bg-size-[200%_100%]',
    'disabled:cursor-not-allowed disabled:opacity-70'
  );

  return (
    <Popconfirm
      title={<div className="font-bold text-lg text-primary-8">Delete entities</div>}
      description={
        <div>
          <div className="font-bold text-sm text-primary-8">
            Are you sure you want to delete {label}?
          </div>
          <small className="font-light text-primary-6">This action cannot be undone.</small>
        </div>
      }
      onConfirm={() => deleteMutation.mutate()}
      okText="Yes"
      cancelText="No"
      placement="bottomRight"
      disabled={deleteMutation.isPending}
      classNames={{
        body: cn(
          'max-w-70',
          '[&_.ant-popconfirm-buttons_button]:rounded-full [&_.ant-popconfirm-buttons_button]:px-5',
          '[&_.ant-popconfirm-buttons_button:last-child]:bg-primary-8'
        ),
      }}
    >
      <motion.div
        initial={{ opacity: 0, x: expanding ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: expanding ? -20 : 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {expanding ? (
          <Button
            rounded
            type="button"
            aria-label={buttonLabel}
            title={buttonLabel}
            variant="default"
            disabled={deleteMutation.isPending}
            className={cn(
              EXPANDING_PILL_BASE_CLASS,
              destructivePalette,
              'focus-visible:ring-2 focus-visible:ring-destructive/40',
              className
            )}
            data-testid="bulk-delete-button"
          >
            <ExpandingPillContent
              icon={renderButtonIcon()}
              label={buttonLabel}
              badge={selectionBadge}
            />
          </Button>
        ) : (
          <Button
            rounded
            type="button"
            variant="default"
            disabled={deleteMutation.isPending}
            className={cn(
              'relative h-12 min-w-45 px-6',
              destructivePalette,
              'transition-all duration-300 ease-out',
              'hover:scale-[1.02] active:scale-[0.98]',
              className
            )}
            data-testid="bulk-delete-button"
          >
            <span className="flex items-center justify-center gap-2.5">
              {renderButtonIcon()}
              <span className="whitespace-nowrap">{children ?? buttonLabel}</span>
            </span>
            {selectionBadge ? (
              <span className="pointer-events-none absolute top-0 right-2 z-10">
                <span className="block -translate-y-1/2 *:ring-2 *:ring-white">
                  {selectionBadge}
                </span>
              </span>
            ) : null}
          </Button>
        )}
      </motion.div>
    </Popconfirm>
  );
}
