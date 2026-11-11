'use client';

import { LoadingOutlined } from '@ant-design/icons';

import type { MechanismVariablesRoot } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';
import type { TScanConfigUIElementDict } from '@/features/scan-config/types';

const LOADING_MESSAGE = 'Loading variables…';

/** inline status note shown in place of the variable picker (loading/gated/empty). */
function ModificationNote({ children }: { children: React.ReactNode }) {
  return <div className="px-1 py-2 text-base text-gray-400">{children}</div>;
}

export interface ModificationShellProps {
  uiElement: TScanConfigUIElementDict;
  data: MechanismVariablesRoot | null;
  loading: boolean;
  /** status note shown in place of the picker (error / no variables); null when usable */
  reason: React.ReactNode | null;
  children: React.ReactNode;
}

/**
 * shared frame for the ion-channel modification ui elements. owns the block wrapper
 * element and the status states (loading/gated/empty) so each variant only declares
 * its picker + editor. for the me-model variant (loading/reason unset) it renders
 * nothing until form-level data resolves; matching the original behavior.
 */
export function ModificationShell({
  uiElement,
  data,
  loading,
  reason,
  children,
}: ModificationShellProps) {
  if (!loading && !reason && !data) return null;

  return (
    <div data-scan-config-block-element={uiElement}>
      {loading ? (
        <ModificationNote>
          {LOADING_MESSAGE} <LoadingOutlined className="ml-1" />
        </ModificationNote>
      ) : reason ? (
        <ModificationNote>{reason}</ModificationNote>
      ) : (
        children
      )}
    </div>
  );
}
