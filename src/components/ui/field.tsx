import type * as React from "react";
import { cn } from "#/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-line bg-surface px-3.5 text-[0.95rem] text-ink",
        "placeholder:text-muted/70 transition-colors [transition-duration:var(--dur)]",
        "hover:border-line-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25",
        "disabled:opacity-55 aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-line bg-surface px-3.5 py-2.5 text-[0.95rem] text-ink",
        "placeholder:text-muted/70 transition-colors [transition-duration:var(--dur)]",
        "hover:border-line-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25",
        className,
      )}
      {...props}
    />
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | undefined;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Erro geral do formulário — o que a API recusou, não o que o campo validou. */
export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
    >
      {children}
    </p>
  );
}
