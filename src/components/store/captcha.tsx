import { useEffect, useRef } from "react";

/**
 * Desafio anti-abuso das escritas sem conta. Sem chave configurada o componente não renderiza
 * nada e a API não exige token — o limite por IP segue sendo a primeira linha. É o mesmo
 * arranjo do cartão: recurso que depende de credencial de plataforma some quando não há
 * credencial, em vez de virar um erro na cara de quem só quer doar.
 */
export function turnstileSiteKey(): string {
  const key = import.meta.env?.VITE_TURNSTILE_SITE_KEY;
  return typeof key === "string" ? key.trim() : "";
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void },
  ) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("turnstile_script_failed"));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function Captcha({ onToken }: { onToken: (token: string) => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const siteKey = turnstileSiteKey();

  useEffect(() => {
    if (!siteKey) return;
    const node = holder.current;
    if (!node) return;
    let widgetId: string | null = null;
    let alive = true;

    void loadScript()
      .then(() => {
        if (!alive || !window.turnstile) return;
        widgetId = window.turnstile.render(node, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          // token do Turnstile vale poucos minutos: se expirar antes do envio, o formulário
          // volta a pedir o desafio em vez de mandar um token morto
          "expired-callback": () => onToken(""),
        });
      })
      .catch(() => undefined);

    return () => {
      alive = false;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;
  return <div ref={holder} className="min-h-[65px]" />;
}
