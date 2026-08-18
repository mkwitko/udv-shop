import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#/lib/utils";

// Base funcional do shadcn, re-tematizada: cantos quase retos, sem sombra plástica,
// uma única curva de transição (--ease/--dur vêm do styles.css).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,border-color,color,transform] disabled:pointer-events-none disabled:opacity-50 [transition-duration:var(--dur)] [transition-timing-function:var(--ease)] active:translate-y-px",
  {
    variants: {
      variant: {
        primary: "bg-clay text-[var(--primary-foreground)] hover:bg-clay-deep",
        moss: "bg-moss text-[var(--secondary-foreground)] hover:bg-moss-soft",
        outline: "border border-[var(--line-strong)] text-ink hover:bg-paper-deep",
        ghost: "text-ink hover:bg-paper-deep",
        link: "text-clay underline underline-offset-4 decoration-1 hover:text-clay-deep",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-sm",
        md: "h-11 px-5 text-[0.95rem] rounded-sm",
        lg: "h-13 px-7 text-base rounded-sm",
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
