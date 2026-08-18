import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium rounded-md transition-[background-color,border-color,color,box-shadow,transform] [transition-duration:var(--dur)] [transition-timing-function:var(--ease)] disabled:pointer-events-none disabled:opacity-55 active:translate-y-px",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-ink hover:bg-brand-hover",
        secondary: "bg-surface text-ink border border-line hover:border-line-strong",
        outline: "border border-line-strong text-ink hover:bg-surface",
        ghost: "text-muted hover:text-ink hover:bg-surface",
        danger: "bg-danger-soft text-danger border border-danger/30 hover:border-danger/60",
        link: "text-brand underline underline-offset-4 decoration-1 hover:text-brand-hover",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-10 px-4 text-[0.95rem]",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
