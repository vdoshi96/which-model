import type { HTMLAttributes } from "react";

import { cn } from "@/lib/ui";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-[5px] border border-border bg-soft px-2 py-1 font-mono text-xs text-secondary",
        className,
      )}
      {...props}
    />
  );
}
