import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { formatRemaining, isExpired, useNow } from "#/lib/pay/countdown";

interface PixPanelProps {
  brCode: string;
  qrCodeImageUrl: string;
  expiresAt: string;
  /** chamado quando o contador chega a zero */
  onExpired: () => void;
}

/**
 * Tela de pagamento Pix pensada para quem nunca pagou nada pela internet:
 * três instruções curtas, o QR grande e um botão único de copiar.
 * A confirmação chega sozinha — quem espera é a página, não a pessoa.
 */
export function PixPanel({ brCode, qrCodeImageUrl, expiresAt, onExpired }: PixPanelProps) {
  const now = useNow();
  const [copied, setCopied] = useState(false);
  const expired = isExpired(expiresAt, now);

  useEffect(() => {
    if (expired) onExpired();
  }, [expired, onExpired]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(brCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // navegador sem clipboard: o código fica visível para seleção manual abaixo
    }
  }

  return (
    <div className="grid gap-6">
      <ol className="grid gap-2 text-[0.95rem] text-muted">
        <li className="flex gap-2.5">
          <StepDot n={1} />
          Abra o aplicativo do seu banco no celular.
        </li>
        <li className="flex gap-2.5">
          <StepDot n={2} />
          Escolha pagar com Pix e aponte a câmera para o código abaixo — ou toque em “copiar código”
          e cole no app do banco.
        </li>
        <li className="flex gap-2.5">
          <StepDot n={3} />A confirmação aparece aqui sozinha, em segundos.
        </li>
      </ol>

      <div className="mx-auto w-full max-w-60">
        <img
          src={qrCodeImageUrl}
          alt="Código QR do Pix"
          className="aspect-square w-full rounded-lg border border-line bg-white p-2"
        />
      </div>

      <div className="grid gap-2">
        <Button size="lg" variant={copied ? "secondary" : "primary"} onClick={copy}>
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden />
              Código copiado!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              Copiar código Pix
            </>
          )}
        </Button>
        <p className="text-center text-sm text-muted tabular-nums">
          O código vale por {formatRemaining(expiresAt, now)}
        </p>
      </div>

      <p className="break-all rounded-md border border-line bg-surface p-3 text-xs text-muted">
        {brCode}
      </p>
    </div>
  );
}

function StepDot({ n }: { n: number }) {
  return (
    <span className="mt-0.5 inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-deep">
      {n}
    </span>
  );
}
