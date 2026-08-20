import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "#/components/site/auth-shell";
import { Button } from "#/components/ui/button";
import { Field, FormError, Input } from "#/components/ui/field";
import { PasswordInput, PasswordRequirements } from "#/components/ui/password-field";
import { errorMessage, fieldErrors } from "#/lib/api/error-message";
import { PASSWORD_MAX, PASSWORD_MIN } from "#/lib/auth/password";
import { useSession } from "#/lib/auth/session";
import { seo } from "#/lib/seo";

// espelha a regra da API (auth/register: min 10, max 200) — se divergir, o usuário
// leva um 400 de validação depois de preencher tudo, que é como este form errava antes.
const RegisterSchema = z
  .object({
    name: z.string().min(2, "Como te chamamos?"),
    email: z.email("E-mail inválido"),
    password: z
      .string()
      .min(PASSWORD_MIN, `Use pelo menos ${PASSWORD_MIN} caracteres`)
      .max(PASSWORD_MAX, `No máximo ${PASSWORD_MAX} caracteres`),
    confirmPassword: z.string().min(1, "Repita a senha"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não são iguais",
  });
type RegisterForm = z.infer<typeof RegisterSchema>;

/** Campo da API → campo do form. Só o que este form manda. */
const API_FIELDS: Record<string, keyof RegisterForm> = {
  name: "name",
  email: "email",
  password: "password",
};

export const Route = createFileRoute("/criar-conta")({
  head: () =>
    seo({
      title: "Criar conta",
      description: "Crie sua conta e coloque sua loja no ar hoje.",
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
    setError,
    setFocus,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(RegisterSchema), mode: "onChange" });

  const password = watch("password") ?? "";
  const confirmPassword = watch("confirmPassword") ?? "";

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      // confirmPassword é só da tela — a API recebe os três campos que conhece
      await createAccount({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      await navigate({ to: "/nova-loja", replace: true });
    } catch (error) {
      // 400 de validação vira erro no campo, não aviso solto no topo
      const fields = fieldErrors(error);
      let focused = false;
      for (const { field, message } of fields) {
        const target = API_FIELDS[field];
        if (!target) continue;
        setError(target, { type: "server", message });
        if (!focused) {
          setFocus(target);
          focused = true;
        }
      }
      if (!focused) setFormError(errorMessage(error));
    }
  });

  return (
    <AuthShell
      title="Criar conta"
      subtitle="Leva um minuto. Depois você escolhe o endereço da loja."
      footer={
        <>
          Já tem conta?{" "}
          <Link to="/entrar" className="text-brand-deep underline underline-offset-4">
            entrar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} method="post" className="grid gap-4" noValidate>
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

        <Field label="Senha" htmlFor="password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby="password-requisitos"
            {...register("password")}
          />
        </Field>

        <PasswordRequirements
          id="password-requisitos"
          value={password}
          confirm={confirmPassword}
          showConfirm={confirmPassword.length > 0}
          className="-mt-1"
        />

        <Field
          label="Repita a senha"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
        </Field>

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Criando…" : "Criar conta"}
        </Button>
      </form>
    </AuthShell>
  );
}
