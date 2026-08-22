import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { RequireSession } from "#/components/auth/require-session";
import { SiteFooter } from "#/components/site/site-footer";
import { SiteHeader } from "#/components/site/site-header";
import { AiStoreDescription } from "#/components/store/ai-text";
import { Button } from "#/components/ui/button";
import { Field, FormError, Input, Textarea } from "#/components/ui/field";
import { errorMessage } from "#/lib/api/error-message";
import { createStore } from "#/lib/api/gen/clients/createStore";
import { listMyStoresQueryKey } from "#/lib/api/gen/hooks/useListMyStores";
import { useSession } from "#/lib/auth/session";
import { seo } from "#/lib/seo";
import { slugify } from "#/lib/slug";

// espelha CreateStoreBody da API: slug 3–60, minúsculas, hífen simples entre palavras
const StoreSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(120),
  slug: z
    .string()
    .min(3, "Mínimo de 3 caracteres")
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífen"),
  description: z.string().max(2000).optional(),
});
type StoreForm = z.infer<typeof StoreSchema>;

export const Route = createFileRoute("/nova-loja")({
  head: () =>
    seo({
      title: "Criar loja",
      description: "Abra sua loja em poucos minutos.",
      path: "/nova-loja",
      noIndex: true,
    }),
  component: () => (
    <RequireSession redirectTo="/nova-loja">
      <NewStorePage />
    </RequireSession>
  ),
});

function NewStorePage() {
  const navigate = useNavigate();
  const { queryClient } = useRouter().options.context;
  const { status, reload } = useSession();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StoreForm>({ resolver: zodResolver(StoreSchema), defaultValues: { slug: "" } });

  const slug = watch("slug");

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await createStore({
        name: values.name,
        slug: values.slug,
        ...(values.description ? { description: values.description } : {}),
      });
      // o papel de owner nasceu agora: sem renovar o token, a gestão da loja recém-criada
      // responde 403 insufficient_persona até a pessoa dar F5.
      await reload();
      await queryClient.invalidateQueries({ queryKey: listMyStoresQueryKey() });
      // vai para /conta e não para a vitrine: a loja nasce pending e a página pública
      // responderia 404 para quem não é membro.
      await navigate({ to: "/conta", replace: true });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  if (status !== "authenticated") return null;

  return (
    <>
      <SiteHeader />

      <main className="shell max-w-2xl py-14">
        <p className="kicker">Nova loja</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Vamos abrir a sua loja
        </h1>
        <p className="mt-2 text-muted">
          São três campos. Depois disso a gestão te mostra, passo a passo, o que falta para a loja
          abrir — cadastrar um produto, dizer onde receber e ativar a assinatura. Ninguém precisa
          aprovar nada.
        </p>

        <form onSubmit={onSubmit} className="card mt-8 grid gap-5 p-6" noValidate>
          <FormError>{formError}</FormError>

          <Field label="Nome da loja" htmlFor="name" error={errors.name?.message}>
            <Input
              id="name"
              placeholder="Loja Estrela do Norte"
              aria-invalid={Boolean(errors.name)}
              {...register("name", {
                onChange: (event) => {
                  // o endereço acompanha o nome até o usuário editar o endereço à mão
                  if (!slug || slug === slugify(watch("name"))) {
                    setValue("slug", slugify(event.target.value), { shouldValidate: false });
                  }
                },
              })}
            />
          </Field>

          <Field
            label="Endereço da loja"
            htmlFor="slug"
            hint={`Sua loja vai ficar em /loja/${slug || "minha-loja"}`}
            error={errors.slug?.message}
          >
            <Input
              id="slug"
              placeholder="estrela-do-norte"
              aria-invalid={Boolean(errors.slug)}
              {...register("slug")}
            />
          </Field>

          <Field
            label="Descrição"
            htmlFor="description"
            hint="Opcional. Aparece na página da loja e no compartilhamento."
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              rows={4}
              placeholder="O que você vende, para onde vai o valor arrecadado…"
              {...register("description")}
            />
          </Field>

          <AiStoreDescription
            name={watch("name") ?? ""}
            description={watch("description") ?? ""}
            onApply={(text) =>
              setValue("description", text, { shouldDirty: true, shouldValidate: true })
            }
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Criando…" : "Criar loja"}
            </Button>
            <Button asChild variant="ghost">
              <Link to="/conta">Cancelar</Link>
            </Button>
          </div>
        </form>
      </main>

      <SiteFooter />
    </>
  );
}
