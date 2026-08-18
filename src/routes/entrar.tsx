import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "#/components/site/auth-shell";
import { Button } from "#/components/ui/button";
import { Field, FormError, Input } from "#/components/ui/field";
import { errorMessage } from "#/lib/api/error-message";
import { useSession } from "#/lib/auth/session";
import { seo } from "#/lib/seo";

const LoginSchema = z.object({
  email: z.email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});
type LoginForm = z.infer<typeof LoginSchema>;

export const Route = createFileRoute("/entrar")({
  // sem a chave quando não há redirect: devolver `redirect: undefined` tornaria o search
  // obrigatório em todo <Link to="/entrar">
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  head: () =>
    seo({
      title: "Entrar",
      description: "Acesse sua conta para cuidar da sua loja.",
      path: "/entrar",
      noIndex: true,
    }),
  component: LoginPage,
});

function LoginPage() {
  const { login, status } = useSession();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [formError, setFormError] = useState<string | null>(null);

  // `redirect` vem da URL: só caminho interno entra, senão vira redirect aberto para
  // fora do site. O cast existe porque o router só conhece rotas literais.
  const target = (
    redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/conta"
  ) as "/conta";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(LoginSchema) });

  // já logado (voltou pelo histórico, ou o refresh restaurou a sessão): não mostra o form
  useEffect(() => {
    if (status === "authenticated") {
      void navigate({ to: target, replace: true });
    }
  }, [status, navigate, target]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      await navigate({ to: target, replace: true });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse o painel da sua loja ou acompanhe seus pedidos."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link to="/criar-conta" className="text-brand-deep underline underline-offset-4">
            criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} method="post" className="grid gap-4" noValidate>
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

        <Field label="Senha" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
        </Field>

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Entrando…" : "Entrar"}
        </Button>

        <Link
          to="/recuperar-senha"
          className="text-center text-sm text-muted underline underline-offset-4 hover:text-ink"
        >
          Esqueci minha senha
        </Link>
      </form>
    </AuthShell>
  );
}
