import type * as React from "react";
import { Input } from "#/components/ui/field";
import { maskAmountInput } from "#/lib/pay/amount";

/**
 * Campo de dinheiro com máscara da direita para a esquerda: "2990" vira
 * "R$ 29,90" enquanto a pessoa digita. Continua um <input> comum — dá para usar
 * com `{...register("price")}` do react-hook-form, porque a máscara reescreve
 * `event.target.value` antes de repassar o onChange.
 *
 * O valor que chega no submit é a string mascarada; `parseAmount` já entende.
 */
export function MoneyInput({ onChange, ...props }: React.ComponentProps<"input">) {
  return (
    <Input
      // numeric: teclado só de dígitos no celular, já que a vírgula é da máscara
      inputMode="numeric"
      placeholder="R$ 0,00"
      autoComplete="off"
      {...props}
      onChange={(event) => {
        const masked = maskAmountInput(event.target.value);
        if (event.target.value !== masked) event.target.value = masked;
        onChange?.(event);
      }}
    />
  );
}
