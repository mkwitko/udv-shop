import type * as React from "react";
import { ChoiceCard } from "#/components/ui/choice-card";

/** Cartão-rádio de forma de pagamento: alvo grande, estado óbvio, texto que explica. */
export function PayChoice(props: {
  checked: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  detail: string;
  disabled?: boolean;
}) {
  return <ChoiceCard name="provider" {...props} />;
}
