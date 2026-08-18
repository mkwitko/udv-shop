import { loadStripe, type Stripe } from "@stripe/stripe-js";

let promise: Promise<Stripe | null> | null = null;

export function stripePublishableKey(): string {
  const key = import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY;
  return typeof key === "string" ? key.trim() : "";
}

/** Carrega o Stripe.js uma vez só. Sem chave configurada, cartão fica indisponível. */
export function getStripe(): Promise<Stripe | null> {
  const key = stripePublishableKey();
  if (!key) return Promise.resolve(null);
  if (!promise) promise = loadStripe(key);
  return promise;
}

/**
 * O Payment Element vem com o tema do Stripe; aqui ele herda os tokens da Colheita.
 * Lido em runtime porque os valores mudam com o tema claro/escuro.
 */
export function stripeAppearance() {
  if (typeof document === "undefined") return {};
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    variables: {
      colorPrimary: token("--brand"),
      colorBackground: token("--elevated"),
      colorText: token("--ink"),
      colorTextSecondary: token("--ink-muted"),
      colorDanger: token("--danger"),
      fontFamily: '"Instrument Sans Variable", ui-sans-serif, system-ui, sans-serif',
      borderRadius: "0.75rem",
    },
  };
}
