import { Check, Copy, QrCode } from "lucide-react";
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
 * Tela de pagamento Pix pensada para quem nunca pagou nada pela internet: três instruções
 * curtas, um botão único de copiar e o QR code como alternativa.
 * A confirmação chega sozinha — quem espera é a página, não a pessoa.
 */
export function PixPanel({ brCode, qrCodeImageUrl, expiresAt, onExpired }: PixPanelProps) {
  const now = useNow();
  const [copied, setCopied] = useState(false);
  // Aberto em tela grande, fechado no celular: quem está no celular não consegue escanear
  // a própria tela, e o QR só empurraria o botão de copiar para baixo da dobra.
  const [showQr, setShowQr] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
  );
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
      {/* Copiar vem antes do QR. No celular — onde quase todo mundo paga — a pessoa ESTÁ
          no aparelho da câmera: mandar apontar a câmera para a própria tela era instrução
          impossível de seguir. O QR continua aí, aberto por padrão só onde ele funciona
          (tela grande, celular na mão). */}
      <ol className="grid gap-2 text-[0.95rem] text-muted">
        <li className="flex gap-2.5">
          <StepDot n={1} />
          <span>Toque em “copiar código Pix” aqui embaixo.</span>
        </li>
        <li className="flex gap-2.5">
          <StepDot n={2} />
          {/* um <span> só: sem ele o <strong> virava item do flex e a frase quebrava em
              colunas no meio das palavras */}
          <span>
            Abra o aplicativo do seu banco, escolha <strong>Pix</strong> e depois{" "}
            <strong>Pix copia e cola</strong>. Cole o código e confirme.
          </span>
        </li>
        <li className="flex gap-2.5">
          <StepDot n={3} />
          <span>Volte para esta tela: a confirmação aparece sozinha, em segundos.</span>
        </li>
      </ol>

      <div className="grid gap-2">
        <Button
          size="lg"
          className="h-[52px]"
          variant={copied ? "secondary" : "primary"}
          onClick={copy}
        >
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
        <p className="text-center text-muted text-sm tabular-nums">
          O código vale por {formatRemaining(expiresAt, now)}
        </p>
      </div>

      <div className="grid gap-3">
        <Button variant="ghost" onClick={() => setShowQr((open) => !open)}>
          <QrCode className="h-4 w-4" aria-hidden />
          {showQr ? "Esconder o QR code" : "Pagar com QR code (de outro celular)"}
        </Button>
        {showQr && (
          <div className="mx-auto w-full max-w-60">
            <img
              src={qrCodeImageUrl}
              alt="Código QR do Pix"
              className="aspect-square w-full rounded-lg border border-line bg-white p-2"
            />
          </div>
        )}
      </div>

      <p className="break-all rounded-md border border-line bg-surface p-3 text-muted text-xs">
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
