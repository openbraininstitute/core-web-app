import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';

import { calloutKindOf, calloutLooks } from '@/features/logbook/blocks/kinds';
import { Icon } from '@/ui/molecules/icon';

import type { NodeViewProps } from '@tiptap/react';

export function CalloutView({ node }: NodeViewProps) {
  const look = calloutLooks[calloutKindOf(String(node.attrs['kind']))];
  return (
    <NodeViewWrapper
      as="aside"
      className="mx-0 mt-[10px] mb-[14px] flex gap-[10px] rounded-[14px] px-[14px] py-3"
      style={{ background: look.tint, color: look.colour }}
    >
      <span
        contentEditable={false}
        className="flex-none pt-0.5 [&>svg]:inline [&>svg]:align-baseline"
      >
        <Icon name="info" size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div contentEditable={false} className="text-[12px] font-bold tracking-[0.06em] uppercase">
          {look.label}
        </div>
        <NodeViewContent as="div" className="text-[15px] leading-[1.55] text-neutral-10" />
      </div>
    </NodeViewWrapper>
  );
}
