import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { ShareButton } from "#/components/ui/share-button";

const COPY = {
  pedido: {
    title: "Guarde o link do seu pedido",
    body: "Este endereço abre o seu pedido a qualquer hora.",
    share: "Meu pedido",
  },
  doacao: {
    title: "Guarde o link da sua doação",
    body: "Este endereço abre a sua doação a qualquer hora.",
    share: "Minha doação",
  },
} as const;

/**
 * O link do pedido ou da doação, com jeito de guardar. Para quem age sem conta este
 * endereço é o único acesso ao que ela fez: não existe login para reencontrá-lo. A tela
 * antes dizia "guarde o link" sem dar meio nenhum de guardar — copiar e mandar no
 * WhatsApp são os dois gestos que essa pessoa já sabe fazer.
 */
export function KeepReceipt({ kind, className }: { kind: keyof typeof COPY; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copyText = COPY[kind];

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // sem clipboard: o endereço continua visível na barra do navegador
    }
  }

  return (
    <div className={`card p-4 text-left ${className ?? ""}`}>
      <p className="font-display font-semibold">{copyText.title}</p>
      <p className="mt-1 text-muted text-sm">
        Você não precisa de conta. {copyText.body} Mande para você mesmo no WhatsApp para não
        perder.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" onClick={copy}>
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden /> Link copiado
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden /> Copiar link
            </>
          )}
        </Button>
        <ShareButton
          title={copyText.share}
          path={`${window.location.pathname}${window.location.search}`}
          label="Enviar no WhatsApp"
          variant="primary"
        />
      </div>
    </div>
  );
}
