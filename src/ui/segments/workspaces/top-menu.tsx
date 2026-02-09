"use client";

import type { ComponentProps } from "react";

import { TopMenuNavigation } from "@/ui/segments/workspaces/top-menu-nav";
import { SpaceSwitcher } from "@/ui/segments/workspaces/space-switcher";
import { HydrateWrapper } from "@/wrappers/hydrate-wrapper";
import { Wallet } from "@/ui/segments/project/balance";
import { cn } from "@/utils/css-class";

type Props = {
  className?: ComponentProps<"div">["className"];
};

export function WorkspaceTopMenu({ className }: Props) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex items-start justify-center gap-2">
        <SpaceSwitcher className="w-93" />
        <Wallet />
      </div>
      <div className="flex items-center justify-center gap-2">
        <HydrateWrapper>
          <TopMenuNavigation />
        </HydrateWrapper>
      </div>
    </div>
  );
}

export default WorkspaceTopMenu;
