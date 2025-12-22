'use client';

import { ErrorSchema } from '@rjsf/utils';
import { ReactNode } from 'react';

import { MenuButton } from '@/ui/segments/workflows/build/ion-channel-build/elements/menu-button';
import {
  BlockGroupProperties,
  extractParentErrors,
} from '@/ui/segments/workflows/build/ion-channel-build/rjsf/helpers';

interface Props {
  // grouped block properties by their sections
  blockGroups: BlockGroupProperties;
  // currently active block name
  activeBlock: string;
  // map of validation errors for each form block
  errorSchema?: ErrorSchema;
  onBlockChange: (propName: string) => void;
  CustomRender?: (props: {
    groupBlock: string;
    propName: string;
    isActive: boolean;
    onClick: (propName: string) => void;
    showErrorIcon: boolean;
    showValidIcon: boolean;
    label: ReactNode;
    description: ReactNode;
  }) => React.ReactNode;
}

export function ConfigurationSidebar({
  blockGroups,
  activeBlock,
  errorSchema,
  onBlockChange,
  CustomRender,
}: Props) {
  return (
    <div className="secondary-scrollbar bg-background flex flex-1 flex-col gap-1.5 overflow-y-auto">
      {Object.entries(blockGroups).map(([groupBlock, blocks]) => {
        return (
          <div key={groupBlock} className="w-full">
            <div className="text-neutral-3 bg-background px-4 py-2 text-xs font-semibold uppercase">
              {groupBlock}
            </div>
            <div className="flex flex-col gap-2 px-2">
              {blocks.map((property) => {
                const { name: propName, label, description } = property;
                const isActive = activeBlock === propName;

                const errors = errorSchema
                  ? (extractParentErrors(errorSchema)?.[propName] ?? [])
                  : [];
                const hasErrors = errors.length > 0;
                const showValidIcon = !hasErrors;
                const showErrorIcon = hasErrors;

                if (CustomRender) {
                  return (
                    <CustomRender
                      key={propName}
                      {...{
                        groupBlock,
                        propName,
                        isActive,
                        onClick: onBlockChange,
                        showErrorIcon,
                        showValidIcon,
                        label,
                        description,
                      }}
                    />
                  );
                }

                return (
                  <MenuButton
                    key={propName}
                    {...{
                      groupBlock,
                      propName,
                      isActive,
                      showErrorIcon,
                      showValidIcon,
                      label,
                      onClick: onBlockChange,
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
