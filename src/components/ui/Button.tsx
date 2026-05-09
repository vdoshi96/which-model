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
        "inline-flex min-h-10 items-center justify-center rounded-[6px] border px-4 py-2 text-sm font-semibold leading-5 transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "border-accent bg-accent text-black shadow-[0_0_0_1px_rgba(200,255,38,0.25),0_12px_30px_rgba(200,255,38,0.12)] hover:bg-primary",
        variant === "secondary" &&
          "border-border-strong bg-raised text-primary hover:border-secondary hover:bg-surface",
        variant === "ghost" &&
          "border-transparent bg-transparent text-secondary hover:bg-raised hover:text-primary",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
