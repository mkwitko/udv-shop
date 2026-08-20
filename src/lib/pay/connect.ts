import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js";
import { createStripeAccountSession } from "#/lib/api/gen/clients/createStripeAccountSession";
import { stripePublishableKey } from "./stripe.js";

/**
 * Aparência dos componentes embutidos. Só estes tokens existem — a Stripe não aceita CSS
 * por fora —, então tudo que dá para casar com a identidade Colheita é lido dos custom
 * properties em runtime, que é o que muda quando o tema vira escuro.
 */
export function connectAppearance() {
  if (typeof document === "undefined") return {};
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    variables: {
      colorPrimary: token("--brand"),
      colorBackground: token("--elevated"),
      colorText: token("--ink"),
      colorDanger: token("--danger"),
      fontFamily: '"Instrument Sans Variable", ui-sans-serif, system-ui, sans-serif',
      borderRadius: "0.75rem",
    },
  };
}

/**
 * Uma instância por loja. O client secret não é guardado: `fetchClientSecret` é chamado de
 * novo pela própria Stripe quando a sessão expira, e cada chamada bate na nossa rota, que
 * é quem decide se aquela pessoa ainda pode abrir o onboarding daquele núcleo.
 */
export function initConnect(slug: string): StripeConnectInstance | null {
  const publishableKey = stripePublishableKey();
  if (!publishableKey) return null;
  return loadConnectAndInitialize({
    publishableKey,
    fetchClientSecret: async () => (await createStripeAccountSession(slug)).clientSecret,
    appearance: connectAppearance(),
    locale: "pt-BR",
  });
}
