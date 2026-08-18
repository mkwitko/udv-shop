import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { RequireSession } from "#/components/auth/require-session";
import { SiteFooter } from "#/components/site/site-footer";
import { SiteHeader } from "#/components/site/site-header";
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
      description: "Abra a loja do seu núcleo.",
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
  const { status } = useSession();
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
      await queryClient.invalidateQueries({ queryKey: listMyStoresQueryKey() });
      // vai para /conta e não para a loja: a loja nasce pending e o token atual ainda não
      // carrega o papel novo, então a página pública responderia 404 para o próprio dono.
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
          Vamos abrir a loja do seu núcleo
        </h1>
        <p className="mt-2 text-muted">
          A loja nasce aguardando liberação. Você já pode cadastrar produtos; ela aparece na vitrine
          pública quando for aprovada.
        </p>

        <form onSubmit={onSubmit} className="card mt-8 grid gap-5 p-6" noValidate>
          <FormError>{formError}</FormError>

          <Field label="Nome da loja" htmlFor="name" error={errors.name?.message}>
            <Input
              id="name"
              placeholder="Núcleo Estrela do Norte"
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
            hint={`Sua loja vai ficar em /loja/${slug || "seu-nucleo"}`}
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
              placeholder="O que o núcleo produz, para onde vai o valor arrecadado…"
              {...register("description")}
            />
          </Field>

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
