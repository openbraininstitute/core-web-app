import { RightOutlined } from "@ant-design/icons";

import { useDefaultBreakpoint } from "@/ui/hooks/create-break-point";
import { Button } from "@/ui/molecules/button";
import { cn } from "@/utils/css-class";

import { useClickWrapper, useValidSetCount } from "./hooks";

import type { IMEModel } from "@/api/entitycore/types";
import type { TSingleNeuronSynaptomeConfiguration } from "@/api/entitycore/types/entities/single-neuron-synaptome";

export interface SynapticSetButtonProps {
  className?: string;
  enabled: boolean;
  active: boolean;
  onClick(): void;
  sessionId: string;
  synapseSets: Map<string, TSingleNeuronSynaptomeConfiguration> | undefined;
}

export default function SynapticSetButton({
  className,
  enabled,
  active,
  onClick,
  sessionId,
  synapseSets,
}: SynapticSetButtonProps) {
  const breakpoint = useDefaultBreakpoint();
  const validSetsCount = useValidSetCount(synapseSets);
  const handleClick = useClickWrapper(sessionId, onClick);

  return (
    <Button
      rounded
      variant="outline"
      size={breakpoint === "l" ? "md" : "lg"}
      className={cn(
        className,
        "disabled:bg-neutral-1/40 w-full justify-start pr-2 shadow-md",
      )}
      active={active}
      onClick={handleClick}
      disabled={!enabled}
    >
      <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
        <div className="shrink-0 font-bold">Synapse sets</div>
        <div className="ml-auto flex items-center justify-center gap-2">
          {!!validSetsCount && (
            <div>
              {validSetsCount > 1
                ? `${validSetsCount} sets`
                : `${validSetsCount} set`}
            </div>
          )}
          <RightOutlined
            className={cn("text-neutral-4 mr-2 transition-all", {
              "-rotate-180 text-white! group-hover:text-white": active,
            })}
          />
        </div>
      </div>
    </Button>
  );
}
