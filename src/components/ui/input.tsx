import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-black/[.08] dark:border-white/[.145] bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";


