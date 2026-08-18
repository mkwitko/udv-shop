import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ImagePlus, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { ConfirmDialog } from "#/components/ui/confirm";
import { Field, FormError, Input, Textarea } from "#/components/ui/field";
import { Tag } from "#/components/ui/tag";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { archiveProduct } from "#/lib/api/gen/clients/archiveProduct";
import { createProduct } from "#/lib/api/gen/clients/createProduct";
import { presignUpload } from "#/lib/api/gen/clients/presignUpload";
import { updateProduct } from "#/lib/api/gen/clients/updateProduct";
import { listProductsQueryKey, useListProducts } from "#/lib/api/gen/hooks/useListProducts";
import type { ListProducts200 } from "#/lib/api/gen/types/ListProducts";
import { publicRequest } from "#/lib/api/public";
import { money } from "#/lib/format";
import { parseAmount } from "#/lib/pay/amount";
import { slugify } from "#/lib/slug";

export const Route = createFileRoute("/gestao/$slug/produtos")({
  component: ProductsAdmin,
});

type Product = ListProducts200["items"][number];

const ProductSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(120),
  price: z.string().min(1, "Informe o preço"),
  description: z.string().max(2000).optional(),
  stock: z.string().optional(),
  onDemand: z.boolean(),
});
type ProductForm = z.infer<typeof ProductSchema>;

function ProductsAdmin() {
  const { slug } = Route.useParams();
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useListProducts(slug, { limit: 50 }, { client: publicRequest });
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const products = data?.items ?? [];

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: listProductsQueryKey(slug, { limit: 50 }) });
  }

  if (editing) {
    return (
      <ProductForm
        slug={slug}
        product={editing === "new" ? null : editing}
        onDone={async () => {
          await refresh();
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Produtos</h2>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" aria-hidden />
          Novo produto
        </Button>
      </div>

      {isPending ? (
        <div className="mt-6 h-32 animate-pulse rounded-lg bg-surface" />
      ) : products.length === 0 ? (
        <div className="card mt-6 px-6 py-14 text-center">
          <h3 className="font-display text-lg font-semibold">Sua vitrine está vazia</h3>
          <p className="mx-auto mt-2 max-w-sm text-muted">
            Cadastre o primeiro produto com foto e preço — leva menos de um minuto.
          </p>
          <Button className="mt-6" onClick={() => setEditing("new")}>
            Cadastrar produto
          </Button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {products.map((product) => (
            <li key={product.id} className="card flex items-center gap-4 p-4">
              {product.imageUrls[0] ? (
                <img
                  src={product.imageUrls[0]}
                  alt=""
                  className="h-14 w-14 rounded-md border border-line bg-surface object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-md bg-[radial-gradient(circle_at_30%_25%,var(--glow),transparent_65%)]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{product.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted tabular-nums">
                  {money(product.priceCents)}
                  {product.availability === "on_demand" ? (
                    <Tag tone="brand">sob encomenda</Tag>
                  ) : product.stock <= 0 ? (
                    <Tag tone="accent">esgotado</Tag>
                  ) : (
                    <span>{product.stock} em estoque</span>
                  )}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setEditing(product)}>
                <Pencil className="h-4 w-4" aria-hidden />
                Editar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
type AcceptedType = (typeof ACCEPTED_TYPES)[number];

function ProductForm({
  slug,
  product,
  onDone,
  onCancel,
}: {
  slug: string;
  product: Product | null;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [images, setImages] = useState<Array<{ key: string; url: string }>>(
    product ? product.images.map((key, i) => ({ key, url: product.imageUrls[i] ?? "" })) : [],
  );
  const [uploading, setUploading] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(ProductSchema),
    defaultValues: product
      ? {
          name: product.name,
          price: (product.priceCents / 100).toFixed(2).replace(".", ","),
          description: product.description ?? undefined,
          stock: String(product.stock),
          onDemand: product.availability === "on_demand",
        }
      : { onDemand: false, stock: "0" },
  });
  const onDemand = watch("onDemand");

  async function pickImage(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type as AcceptedType)) {
      setFormError("Use uma foto em JPG, PNG, WebP ou AVIF.");
      return;
    }
    setUploading(true);
    setFormError(null);
    try {
      const presigned = await presignUpload({
        storeSlug: slug,
        contentType: file.type as AcceptedType,
      });
      const response = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("upload_failed");
      setImages((current) => [...current, { key: presigned.key, url: presigned.publicUrl }]);
    } catch (error) {
      setFormError(
        error instanceof Error && error.message === "upload_failed"
          ? "A foto não subiu. Tente de novo."
          : errorMessage(error),
      );
    } finally {
      setUploading(false);
    }
  }

  async function submit(values: ProductForm) {
    setFormError(null);
    const priceCents = parseAmount(values.price);
    if (priceCents === null || priceCents <= 0) {
      setFormError("Preço inválido. Escreva como no dia a dia: 45 ou 45,90.");
      return;
    }
    const payload = {
      name: values.name,
      description: values.description || undefined,
      priceCents,
      images: images.map((image) => image.key),
      stock: values.onDemand ? 0 : Math.max(0, Number.parseInt(values.stock || "0", 10) || 0),
      availability: values.onDemand ? ("on_demand" as const) : ("in_stock" as const),
    };
    try {
      if (product) {
        await updateProduct(slug, product.slug, payload);
      } else {
        await createProduct(slug, { ...payload, slug: slugify(values.name) });
      }
      await onDone();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  const [confirmArchive, setConfirmArchive] = useState(false);
  const toast = useToast();

  async function archive() {
    if (!product) return;
    setConfirmArchive(false);
    setArchiving(true);
    try {
      await archiveProduct(slug, product.slug);
      toast("Produto tirado do ar.");
      await onDone();
    } catch (error) {
      setFormError(errorMessage(error));
      setArchiving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {product ? `Editar ${product.name}` : "Novo produto"}
        </h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Voltar
        </Button>
      </div>

      <form onSubmit={handleSubmit(submit)} className="mt-6 grid gap-5">
        <Field label="Nome do produto" htmlFor="name" error={errors.name?.message}>
          <Input id="name" placeholder="Camiseta bordada" {...register("name")} />
        </Field>

        <Field
          label="Preço"
          htmlFor="price"
          hint="Escreva como no dia a dia: 45 ou 45,90"
          error={errors.price?.message}
        >
          <Input id="price" inputMode="decimal" placeholder="R$ 0,00" {...register("price")} />
        </Field>

        <Field
          label="Descrição (opcional)"
          htmlFor="description"
          error={errors.description?.message}
        >
          <Textarea
            id="description"
            rows={3}
            placeholder="Material, tamanho, história de quem faz…"
            {...register("description")}
          />
        </Field>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 accent-(--brand)"
            {...register("onDemand")}
          />
          <span>
            <span className="font-medium text-ink">Feito sob encomenda</span>
            <span className="block text-muted">
              Sem estoque: quem quiser entra numa lista e é avisado quando chegar.
            </span>
          </span>
        </label>

        {!onDemand && (
          <Field label="Quantidade em estoque" htmlFor="stock" error={errors.stock?.message}>
            <Input id="stock" type="number" min={0} inputMode="numeric" {...register("stock")} />
          </Field>
        )}

        <div className="grid gap-2">
          <span className="text-sm font-medium text-ink">Fotos</span>
          <div className="flex flex-wrap gap-2">
            {images.map((image) => (
              <span key={image.key} className="relative">
                <img
                  src={image.url}
                  alt=""
                  className="h-20 w-20 rounded-md border border-line bg-surface object-cover"
                />
                <button
                  type="button"
                  aria-label="Remover foto"
                  onClick={() =>
                    setImages((current) =>
                      current.filter((candidate) => candidate.key !== image.key),
                    )
                  }
                  className="-top-2 -right-2 absolute inline-grid h-6 w-6 place-items-center rounded-full border border-line bg-elevated text-muted hover:text-danger"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </span>
            ))}
            <label className="inline-grid h-20 w-20 cursor-pointer place-items-center rounded-md border border-line border-dashed text-muted hover:border-line-strong hover:text-ink">
              <ImagePlus className="h-5 w-5" aria-hidden />
              <span className="sr-only">Adicionar foto</span>
              <input
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                className="sr-only"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void pickImage(file);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          {uploading && <p className="text-sm text-muted">Enviando foto…</p>}
        </div>

        <FormError>{formError}</FormError>

        <Button size="lg" type="submit" disabled={isSubmitting || uploading}>
          {isSubmitting ? "Salvando…" : product ? "Salvar alterações" : "Publicar produto"}
        </Button>

        {product && (
          <button
            type="button"
            onClick={() => setConfirmArchive(true)}
            disabled={archiving}
            className="justify-self-start text-muted text-sm underline underline-offset-4 hover:text-danger"
          >
            {archiving ? "Tirando do ar…" : "Arquivar produto"}
          </button>
        )}

        <ConfirmDialog
          open={confirmArchive}
          title="Arquivar este produto?"
          confirmLabel="Arquivar produto"
          busy={archiving}
          onCancel={() => setConfirmArchive(false)}
          onConfirm={archive}
        >
          Ele some da vitrine. Pedidos já feitos não mudam.
        </ConfirmDialog>
      </form>
    </div>
  );
}
