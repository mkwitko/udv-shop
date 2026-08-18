import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium rounded-full transition-[background-color,border-color,color,box-shadow,transform] [transition-duration:var(--dur)] [transition-timing-function:var(--ease)] disabled:pointer-events-none disabled:opacity-55 active:translate-y-px",
  {
    variants: {
      variant: {
        // ação primária é monocromática invertida (tinta ⇄ marfim) — o cobre fica
        // para links, detalhes e a variante brand, usada com parcimônia
        primary:
          "bg-cta text-cta-ink hover:bg-cta-hover shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_1px_2px_rgb(0_0_0/0.12)]",
        brand:
          "bg-brand text-brand-ink hover:bg-brand-hover shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(0_0_0/0.1)]",
        secondary:
          "bg-elevated text-ink border border-line hover:border-line-strong shadow-[0_1px_2px_rgb(0_0_0/0.05)]",
        outline: "border border-line-strong text-ink hover:bg-surface",
        ghost: "text-muted hover:text-ink hover:bg-surface",
        danger: "bg-danger-soft text-danger border border-danger/30 hover:border-danger/60",
        link: "text-brand underline underline-offset-4 decoration-1 hover:text-brand-hover",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-[0.95rem]",
        lg: "h-12 px-7 text-base",
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
