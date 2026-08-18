import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "#/components/site/auth-shell";
import { Button } from "#/components/ui/button";
import { Field, FormError, Input } from "#/components/ui/field";
import { errorMessage } from "#/lib/api/error-message";
import { useSession } from "#/lib/auth/session";
import { seo } from "#/lib/seo";

// senha mínima espelha a regra da API: 8 caracteres
const RegisterSchema = z.object({
  name: z.string().min(2, "Como te chamamos?"),
  email: z.email("E-mail inválido"),
  password: z.string().min(8, "Use pelo menos 8 caracteres"),
});
type RegisterForm = z.infer<typeof RegisterSchema>;

export const Route = createFileRoute("/criar-conta")({
  head: () =>
    seo({
      title: "Criar conta",
      description: "Crie sua conta e abra a loja do seu núcleo em minutos.",
      path: "/criar-conta",
    }),
  component: RegisterPage,
});

function RegisterPage() {
  const { register: createAccount } = useSession();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(RegisterSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await createAccount(values);
      await navigate({ to: "/nova-loja", replace: true });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  return (
    <AuthShell
      title="Criar conta"
      subtitle="Leva um minuto. Depois você escolhe o endereço da loja."
      footer={
        <>
          Já tem conta?{" "}
          <Link to="/entrar" className="text-brand underline underline-offset-4">
            entrar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormError>{formError}</FormError>

        <Field label="Seu nome" htmlFor="name" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Maria Silva"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </Field>

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

        <Field
          label="Senha"
          htmlFor="password"
          hint="Pelo menos 8 caracteres."
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
        </Field>

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Criando…" : "Criar conta"}
        </Button>
      </form>
    </AuthShell>
  );
}
