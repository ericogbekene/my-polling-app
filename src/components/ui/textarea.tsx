import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-black/[.08] dark:border-white/[.145] bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";


