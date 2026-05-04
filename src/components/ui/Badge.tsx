import type { HTMLAttributes } from "react";

import { cn } from "@/lib/ui";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center border border-border px-2 py-1 font-mono text-xs text-secondary",
        className,
      )}
      {...props}
    />
  );
}
