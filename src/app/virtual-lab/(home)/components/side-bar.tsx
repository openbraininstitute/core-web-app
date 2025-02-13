import { useState, forwardRef } from "react";
import { classNames } from "@/util/utils";

export function Header({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-sidebar="header"
            className={classNames("flex flex-col gap-2 p-2", className)}
            {...props}
        />
    )
}

export function Content({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-sidebar="content"
            className={classNames(
                "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
                className
            )}
            {...props}
        />
    )
}

export default function Sidebar({ className, children, side = "left", ...props }: React.ComponentProps<"div"> & {
    side?: "left" | "right",
    children: React.ReactNode,
}) {
    const [state, setState] = useState<"expanded" | "collapsed">("expanded");

    return (
        <div
            className="group peer hidden text-sidebar-foreground md:block"
            data-state={state}
            data-side={side}
            style={{ "--sidebar-width": "20rem" } as React.CSSProperties}
        >
            <div
                className={classNames(
                    "relative h-svh w-[--sidebar-width] bg-transparent transition-[width] duration-200 ease-linear",
                    "group-data-[side=right]:rotate-180",
                )}
            />
            <div
                className={classNames(
                    "fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] duration-200 ease-linear md:flex",
                    side === "left"
                        ? "left-0"
                        : "right-0",
                    className
                )}
                {...props}
            >
                <div
                    data-sidebar="sidebar"
                    className="flex h-full w-full flex-col bg-sidebar p-2"
                >
                    {children}
                </div>
            </div>
        </div>
    )
}