import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { FormError } from "#/components/ui/field";
import { getStripe, stripeAppearance, stripePublishableKey } from "#/lib/pay/stripe";

interface StripePanelProps {
  clientSecret: string;
  /** rótulo do botão — sempre com o valor: "Pagar R$ 42,00" */
  submitLabel: string;
  /** pagamento aprovado no navegador; o servidor ainda confirma via webhook */
  onConfirmed: () => void;
}

/** Formulário de cartão do Stripe vestido com os tokens da Colheita. */
export function StripePanel({ clientSecret, submitLabel, onConfirmed }: StripePanelProps) {
  if (!stripePublishableKey()) {
    return (
      <FormError>
        O pagamento com cartão está indisponível neste momento. Volte e escolha Pix — é aprovado na
        hora.
      </FormError>
    );
  }

  return (
    <Elements stripe={getStripe()} options={{ clientSecret, appearance: stripeAppearance() }}>
      <StripeForm submitLabel={submitLabel} onConfirmed={onConfirmed} />
    </Elements>
  );
}

function StripeForm({
  submitLabel,
  onConfirmed,
}: {
  submitLabel: string;
  onConfirmed: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const result = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (result.error) {
      setError(result.error.message ?? "O pagamento não foi aprovado. Confira os dados do cartão.");
      setSubmitting(false);
      return;
    }
    onConfirmed();
  }

  return (
    <form onSubmit={pay} className="grid gap-4">
      <PaymentElement />
      <FormError>{error}</FormError>
      <Button size="lg" type="submit" disabled={!stripe || submitting}>
        {submitting ? "Confirmando…" : submitLabel}
      </Button>
    </form>
  );
}
