import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#/lib/utils";

const tagVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "border-line bg-surface text-muted",
        brand: "border-brand/30 bg-brand-soft text-brand-deep",
        accent: "border-accent/35 bg-accent/10 text-accent",
        success: "border-success/30 bg-success-soft text-success",
        danger: "border-danger/30 bg-danger-soft text-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type TagProps = React.ComponentProps<"span"> & VariantProps<typeof tagVariants>;

export function Tag({ className, tone, ...props }: TagProps) {
  return <span className={cn(tagVariants({ tone }), className)} {...props} />;
}
