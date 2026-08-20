import * as React from "react";
import { Input } from "#/components/ui/field";
import { checkPassword, passwordStrength, passwordStrengthLabel } from "#/lib/auth/password";
import { cn } from "#/lib/utils";

/**
 * Input de senha com olho para revelar. O botão fica dentro do campo e cumpre
 * 44px de alvo no celular — senha digitada às cegas no telefone é o motivo nº 1
 * de erro no cadastro.
 */
export function PasswordInput({ className, ...props }: React.ComponentProps<"input">) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-12", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? "Esconder senha" : "Mostrar senha"}
        title={visible ? "Esconder senha" : "Mostrar senha"}
        className={cn(
          "absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-md text-muted",
          "transition-colors [transition-duration:var(--dur)] hover:text-ink",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        )}
      >
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}

function Eye() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Mostrar senha</title>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Esconder senha</title>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.4 3.2M6.3 7.9A17 17 0 0 0 2.5 12s3.5 6 9.5 6a9 9 0 0 0 3.3-.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

const BAR_TONE: Record<string, string> = {
  vazia: "bg-line",
  fraca: "bg-danger",
  media: "bg-warning",
  boa: "bg-brand",
  forte: "bg-success",
};

const BAR_STEPS: Record<string, number> = { vazia: 0, fraca: 1, media: 2, boa: 3, forte: 4 };

/**
 * Exigências em tempo real. Verde = cumprida. As obrigatórias são as que a API
 * recusa; as outras aparecem como recomendação, para não mentir sobre a regra.
 */
export function PasswordRequirements({
  id,
  value,
  confirm,
  showConfirm = false,
  className,
}: {
  id?: string;
  value: string;
  confirm?: string;
  showConfirm?: boolean;
  className?: string;
}) {
  const checks = checkPassword(value);
  // "no máximo 200" só serve de alerta quando o usuário chega perto — item verde
  // permanente para uma regra que ninguém encosta é ruído.
  const visible = checks.filter((c) => c.rule.id !== "max" || value.length > 160);
  const strength = passwordStrength(value);
  const label = passwordStrengthLabel(strength);
  const matches = confirm !== undefined && confirm.length > 0 && confirm === value;

  return (
    <div id={id} className={cn("grid gap-2.5", className)}>
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors [transition-duration:var(--dur)]",
                i < (BAR_STEPS[strength] ?? 0) ? BAR_TONE[strength] : "bg-line",
              )}
            />
          ))}
        </div>
        {label ? <span className="text-muted text-xs">{label}</span> : null}
      </div>

      {/* polite: cada tecla digitada não pode interromper o leitor de tela */}
      <ul className="grid gap-1.5" aria-live="polite">
        {visible.map(({ rule, ok }) => (
          <RequirementRow key={rule.id} ok={ok} label={rule.label} />
        ))}
        {showConfirm ? <RequirementRow ok={matches} label="As duas senhas são iguais" /> : null}
      </ul>
    </div>
  );
}

function RequirementRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span
        className={cn(
          "grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors [transition-duration:var(--dur)]",
          ok ? "border-success bg-success text-white" : "border-line-strong text-transparent",
        )}
        aria-hidden
      >
        <svg
          viewBox="0 0 12 12"
          className="h-2.5 w-2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          role="presentation"
        >
          <path d="M2.5 6.4 4.8 8.7 9.5 3.6" />
        </svg>
      </span>
      <span className={ok ? "text-ink" : "text-muted"}>{label}</span>
      <span className="sr-only">{ok ? "cumprido" : "falta"}</span>
    </li>
  );
}
