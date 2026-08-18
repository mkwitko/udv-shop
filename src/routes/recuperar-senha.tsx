import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "#/components/site/auth-shell";
import { Button } from "#/components/ui/button";
import { Field, FormError, Input } from "#/components/ui/field";
import { errorMessage } from "#/lib/api/error-message";
import { forgotPassword } from "#/lib/api/gen/clients/forgotPassword";
import { seo } from "#/lib/seo";

const ForgotSchema = z.object({ email: z.email("E-mail inválido") });
type ForgotForm = z.infer<typeof ForgotSchema>;

export const Route = createFileRoute("/recuperar-senha")({
  head: () =>
    seo({
      title: "Recuperar senha",
      description: "Receba um link para definir uma senha nova.",
      path: "/recuperar-senha",
      noIndex: true,
    }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({ resolver: zodResolver(ForgotSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await forgotPassword(values);
      setSent(true);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Mandamos um link para você definir uma senha nova."
      footer={
        <Link to="/entrar" className="text-brand-deep underline underline-offset-4">
          voltar para entrar
        </Link>
      }
    >
      {sent ? (
        // resposta igual para e-mail existente ou não: dizer qual existe entrega a lista de contas
        <p className="text-[0.95rem] text-muted">
          Se houver conta com esse e-mail, o link chega em instantes. Confira também a caixa de
          spam.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormError>{formError}</FormError>

          <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </Field>

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Enviando…" : "Enviar link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
