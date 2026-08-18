import { Check } from "lucide-react";
import type * as React from "react";

/** Cartão-rádio de forma de pagamento: alvo grande, estado óbvio, texto que explica. */
export function PayChoice({
  checked,
  onSelect,
  icon,
  title,
  detail,
  disabled,
}: {
  checked: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  detail: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3.5 rounded-lg border p-4 transition-colors [transition-duration:var(--dur)] ${
        checked ? "border-brand bg-brand-pale" : "border-line bg-elevated hover:border-line-strong"
      } ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
    >
      <input
        type="radio"
        name="provider"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
      />
      <span
        className={`inline-grid h-10 w-10 shrink-0 place-items-center rounded-md ${
          checked ? "bg-brand text-brand-ink" : "bg-surface text-muted"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted">{detail}</span>
      </span>
      {checked && <Check className="ml-auto h-5 w-5 shrink-0 text-brand-deep" aria-hidden />}
    </label>
  );
}
