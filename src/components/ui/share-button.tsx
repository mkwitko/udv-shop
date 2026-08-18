import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { Button, type ButtonProps } from "#/components/ui/button";
import { useToast } from "#/components/ui/toast";

/**
 * Compartilhar é aquisição (§14 e §45 do brief): no celular abre o menu do sistema
 * (WhatsApp em dois toques); no desktop copia o link e avisa. Um componente só para
 * loja, produto e campanha — nada de modal.
 */
export function ShareButton({
  title,
  path,
  label = "Compartilhar",
  text,
  variant = "secondary",
  size,
  className,
}: {
  title: string;
  /** caminho da página, ex.: `/loja/boa-colheita/p/caneca` */
  path: string;
  label?: string;
  text?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function share() {
    const url = `${window.location.origin}${path}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url, ...(text ? { text } : {}) });
      } catch {
        // menu fechado pela pessoa: não é erro, não avisa nada
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Link copiado.");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast("Copie o link da barra de endereço.", "error");
    }
  }

  return (
    <Button variant={variant} size={size} className={className} onClick={share}>
      {copied ? (
        <>
          <Check className="h-4 w-4" aria-hidden />
          Link copiado
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" aria-hidden />
          {label}
        </>
      )}
    </Button>
  );
}
