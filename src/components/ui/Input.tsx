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
        "h-11 w-full border border-border bg-surface px-3 text-primary outline-none placeholder:text-secondary focus:border-accent",
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
        "min-h-40 w-full resize-none border border-border bg-surface p-4 text-primary outline-none placeholder:text-secondary focus:border-accent",
        className,
      )}
      {...props}
    />
  );
}
