import { Minus, Plus } from "lucide-react";

/**
 * Quantidade com − e +. Botão em vez de campo numérico porque no celular o teclado
 * numérico cobre metade da tela para escrever "2", e o limite é o estoque real: pedir
 * três de um produto com dois em estoque só quebra no checkout.
 */
export function QuantityPicker({
  value,
  max,
  onChange,
  label = "Quantidade",
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  label?: string;
}) {
  const canDecrease = value > 1;
  const canIncrease = value < max;

  return (
    <div className="flex items-center gap-3">
      <span className="font-medium text-sm">{label}</span>
      {/* sem `role=group`: cada botão já se anuncia ("Aumentar quantidade") e o valor
          é lido pelo `aria-live` — um grupo nomeado aqui só repetiria o rótulo */}
      <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={!canDecrease}
          aria-label="Diminuir quantidade"
          className="grid h-9 w-9 place-items-center rounded-full text-ink transition-colors [transition-duration:var(--dur)] hover:bg-elevated disabled:opacity-35"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <output className="min-w-8 text-center font-medium tabular-nums" aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={!canIncrease}
          aria-label="Aumentar quantidade"
          className="grid h-9 w-9 place-items-center rounded-full text-ink transition-colors [transition-duration:var(--dur)] hover:bg-elevated disabled:opacity-35"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {/* o limite aparece quando chega perto: "por que não sobe?" não pode ser mistério */}
      {!canIncrease && max > 0 && (
        <span className="text-muted text-sm">
          {max === 1 ? "só há uma unidade" : `máximo de ${max}`}
        </span>
      )}
    </div>
  );
}
