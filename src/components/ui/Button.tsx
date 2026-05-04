"use client";

import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/ui";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center border px-4 font-mono text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "border-accent bg-accent text-black hover:bg-primary",
        variant === "secondary" &&
          "border-border bg-surface text-primary hover:border-secondary",
        variant === "ghost" &&
          "border-transparent bg-transparent text-secondary hover:text-primary",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
