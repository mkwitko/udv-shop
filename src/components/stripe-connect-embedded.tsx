import type { StripeConnectInstance } from "@stripe/connect-js";
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
  ConnectNotificationBanner,
} from "@stripe/react-connect-js";
import { useEffect, useState } from "react";
import { connectAppearance, initConnect } from "#/lib/pay/connect";
import { useTheme } from "#/lib/theme";

type Props = {
  slug: string;
  /** Mostra o formulário de cadastro; fora dele fica só o aviso de pendência. */
  showOnboarding: boolean;
  /** Chamado quando o núcleo sai do fluxo — a tela relê o status para saber o que mudou. */
  onExit: () => void;
  /**
   * A Stripe não conseguiu montar o componente (sessão recusada, conta inválida, script
   * bloqueado). Ela desenha um bloco de erro próprio, sem tema — branco dentro da página
   * escura — e o núcleo fica sem caminho. Quem chama usa isto para voltar ao fluxo
   * hospedado.
   */
  onLoadError: () => void;
};

/**
 * Onboarding e avisos da Stripe dentro do /gestao, no lugar do redirect hospedado
 * (ADR-026). O notification banner fica sempre visível: é ele que avisa quando a Stripe
 * passa a exigir um dado novo, antes da conta ser desabilitada e a loja parar de vender
 * sem ninguém entender por quê.
 */
export function StripeConnectEmbedded({ slug, showOnboarding, onExit, onLoadError }: Props) {
  const { resolved } = useTheme();
  const [instance, setInstance] = useState<StripeConnectInstance | null>(null);

  useEffect(() => {
    setInstance(initConnect(slug));
  }, [slug]);

  // A Stripe não relê os tokens sozinha: sem este update o componente fica claro dentro
  // da página escura.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `resolved` é o gatilho — connectAppearance() lê o tema pelo CSS, não por prop
  useEffect(() => {
    if (instance) instance.update({ appearance: connectAppearance() });
  }, [instance, resolved]);

  if (!instance) return null;

  return (
    <div className="mt-4">
      <ConnectComponentsProvider connectInstance={instance}>
        <ConnectNotificationBanner onLoadError={onLoadError} />
        {showOnboarding && <ConnectAccountOnboarding onExit={onExit} onLoadError={onLoadError} />}
      </ConnectComponentsProvider>
    </div>
  );
}
