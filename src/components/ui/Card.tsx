import type { HTMLAttributes } from "react";

import { cn } from "@/lib/ui";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[8px] border border-border bg-surface p-5 shadow-[var(--shadow-soft)]",
        className,
      )}
      {...props}
    />
  );
}
