"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/ui";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[6px] border border-border bg-soft px-3 text-sm text-primary outline-none transition placeholder:text-muted focus:border-accent focus:bg-surface",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-40 w-full resize-none rounded-[6px] border border-border bg-soft p-4 text-sm leading-6 text-primary outline-none transition placeholder:text-muted focus:border-accent focus:bg-surface",
        className,
      )}
      {...props}
    />
  );
}
