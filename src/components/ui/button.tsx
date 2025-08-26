"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
    const variants: Record<string, string> = {
      default: "bg-foreground text-background hover:opacity-90",
      secondary:
        "bg-black/[.05] dark:bg-white/[.06] text-foreground hover:bg-black/[.08] dark:hover:bg-white/[.1]",
      ghost: "hover:bg-black/[.05] dark:hover:bg-white/[.06]",
    };
    const sizes: Record<string, string> = {
      sm: "h-8 px-3",
      md: "h-10 px-4",
      lg: "h-12 px-6 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";


