import type { HTMLAttributes } from "react";

import { cn } from "@/lib/ui";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border border-border bg-surface p-5", className)}
      {...props}
    />
  );
}
