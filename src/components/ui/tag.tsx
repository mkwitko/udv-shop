import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#/lib/utils";

const tagVariants = cva(
  "inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium tracking-wide",
  {
    variants: {
      tone: {
        neutral: "border-[var(--line)] text-ink-soft",
        moss: "border-moss/30 bg-moss/10 text-moss",
        clay: "border-clay/30 bg-clay/10 text-clay",
        ocre: "border-ocre/40 bg-ocre/12 text-[color-mix(in_oklab,var(--ocre)_75%,var(--ink))]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type TagProps = React.ComponentProps<"span"> & VariantProps<typeof tagVariants>;

export function Tag({ className, tone, ...props }: TagProps) {
  return <span className={cn(tagVariants({ tone }), className)} {...props} />;
}
