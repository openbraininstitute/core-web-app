'use client';

import { DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import sessionAtom from '@/state/session';
import { Button } from '@/ui/molecules/button';
import type { RenderButtonProps } from '@/ui/segments/data-table/elements/use-row-selection';
import { cn } from '@/utils/css-class';

export function EntityDeleteButton<T extends EntityCoreIdentifiable>({
  children,
  selectedRows,
  loading,
  onClick,
}: Pick<RenderButtonProps<T>, 'selectedRows'> & {
  children?: ReactNode;
  loading?: boolean;
  onClick?: () => void;
}) {
  const session = useAtomValue(sessionAtom);
  const entityCount = selectedRows.length;
  const isSingular = entityCount === 1;

  const getButtonLabel = (): string => {
    return isSingular ? `Delete entity (${entityCount})` : `Delete entities (${entityCount})`;
  };

  const renderButtonIcon = () => {
    return (
      <AnimatePresence mode="wait">
        {loading ? (
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

  if (!session) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Button
        rounded
        variant="default"
        disabled={loading}
        className={cn(
          'relative h-12 min-w-45 overflow-hidden border border-white/20 px-6 font-semibold',
          'bg-linear-to-r from-primary-9 via-primary-8 to-primary-9 bg-size-[200%_100%]',
          'transition-all duration-300 ease-out',
          'hover:scale-[1.02] active:scale-[0.98]',
          'disabled:cursor-not-allowed disabled:opacity-70'
        )}
        onClick={onClick}
        data-testid="bulk-delete-button"
      >
        <span className="flex items-center justify-center gap-2.5">
          {renderButtonIcon()}
          <span className="whitespace-nowrap">{children ?? getButtonLabel()}</span>
        </span>
      </Button>
    </motion.div>
  );
}
