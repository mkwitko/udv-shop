import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ImagePlus, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { ConfirmDialog } from "#/components/ui/confirm";
import { EmptyState } from "#/components/ui/empty-state";
import { Field, FormError, Input, Select, Textarea } from "#/components/ui/field";
import { SkeletonRows } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { archiveProduct } from "#/lib/api/gen/clients/archiveProduct";
import { createProduct } from "#/lib/api/gen/clients/createProduct";
import { presignUpload } from "#/lib/api/gen/clients/presignUpload";
import { restoreProduct } from "#/lib/api/gen/clients/restoreProduct";
import { updateProduct } from "#/lib/api/gen/clients/updateProduct";
import { useGetConnectStatus } from "#/lib/api/gen/hooks/useGetConnectStatus";
import { useListMyStores } from "#/lib/api/gen/hooks/useListMyStores";
import { listProductsQueryKey, useListProducts } from "#/lib/api/gen/hooks/useListProducts";
import { useListSuppliers } from "#/lib/api/gen/hooks/useListSuppliers";
import type { ListProducts200 } from "#/lib/api/gen/types/ListProducts";
import { money } from "#/lib/format";
import { parseAmount } from "#/lib/pay/amount";
import {
  formatPercentFromBps,
  payoutBreakdown,
  payoutUnitCents,
  payoutValueForApi,
} from "#/lib/payout";
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
  // repasse: parceiro vazio significa "a loja fica com tudo"
  supplierId: z.string(),
  payoutMode: z.enum(["fixed", "percent"]),
  payoutValue: z.string(),
});
type ProductForm = z.infer<typeof ProductSchema>;

// `all: "true"` traz também os arquivados — a gestão precisa ver o que tirou do ar
// para poder trazer de volta. A vitrine pública continua chamando sem esse parâmetro.
const LIST_QUERY = { limit: 50, all: "true" } as const;

function ProductsAdmin() {
  const { slug } = Route.useParams();
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useListProducts(slug, LIST_QUERY);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const toast = useToast();
  const all = data?.items ?? [];
  const products = all.filter((product) => product.active);
  const archived = all.filter((product) => !product.active);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: listProductsQueryKey(slug, LIST_QUERY) });
  }

  async function restore(product: Product) {
    setRestoring(product.slug);
    setListError(null);
    try {
      await restoreProduct(slug, product.slug);
      toast(`${product.name} voltou para a vitrine.`);
      await refresh();
    } catch (error) {
      setListError(errorMessage(error));
    } finally {
      setRestoring(null);
    }
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

      <FormError>{listError}</FormError>

      {isPending ? (
        <SkeletonRows rows={3} className="mt-6" />
      ) : products.length === 0 && archived.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Ainda não há produtos."
          action={<Button onClick={() => setEditing("new")}>Adicionar produto</Button>}
        >
          Adicione o primeiro produto da sua loja para começar a vender. Leva menos de um minuto:
          nome, preço e foto.
        </EmptyState>
      ) : (
        <>
          {products.length === 0 ? (
            <EmptyState
              className="mt-6"
              title="Nenhum produto na vitrine agora."
              action={<Button onClick={() => setEditing("new")}>Adicionar produto</Button>}
            >
              Os produtos abaixo estão arquivados. Você pode restaurar um deles ou cadastrar um
              novo.
            </EmptyState>
          ) : (
            <ul className="mt-6 grid gap-3">
              {products.map((product) => (
                <li key={product.id} className="card flex flex-wrap items-center gap-4 p-4">
                  <ProductThumb product={product} />
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

          {archived.length > 0 && (
            <section className="mt-10">
              <h3 className="kicker">Arquivados</h3>
              <p className="mt-2 text-muted text-sm">
                Fora da vitrine e sem receber compras. O histórico continua salvo — restaure quando
                quiser vender de novo.
              </p>
              <ul className="mt-4 grid gap-3">
                {archived.map((product) => (
                  <li
                    key={product.id}
                    className="card flex flex-wrap items-center gap-4 p-4 opacity-80"
                  >
                    <ProductThumb product={product} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted tabular-nums">
                        {money(product.priceCents)}
                        <Tag>arquivado</Tag>
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={restoring === product.slug}
                      onClick={() => restore(product)}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      {restoring === product.slug ? "Restaurando…" : "Restaurar produto"}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** Volta do formato da API para o que a pessoa digitou: centavos ou porcentagem. */
function payoutValueToInput(payout: Product["payout"]): string {
  if (!payout) return "";
  return payout.kind === "percent_bps"
    ? String(payout.value / 100).replace(".", ",")
    : (payout.value / 100).toFixed(2).replace(".", ",");
}

function ProductThumb({ product }: { product: Product }) {
  if (!product.imageUrls[0]) {
    return (
      <div
        className="h-14 w-14 shrink-0 rounded-md bg-[radial-gradient(circle_at_30%_25%,var(--glow),transparent_65%)]"
        aria-hidden
      />
    );
  }
  return (
    <img
      src={product.imageUrls[0]}
      alt=""
      className="h-14 w-14 shrink-0 rounded-md border border-line bg-surface object-cover"
    />
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
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);

  // repasse é acordo comercial da loja: quem é equipe não vê nem edita
  const { data: stores } = useListMyStores();
  const role = stores?.items.find((candidate) => candidate.slug === slug)?.role;
  const canPayout = role === "owner" || role === "admin";
  const { data: suppliers } = useListSuppliers(
    slug,
    { limit: 50 },
    { query: { enabled: canPayout } },
  );
  const { data: connect } = useGetConnectStatus(slug, { query: { enabled: canPayout } });

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
          supplierId: product.payout?.supplierId ?? "",
          payoutMode: product.payout?.kind === "percent_bps" ? "percent" : "fixed",
          payoutValue: payoutValueToInput(product.payout),
        }
      : {
          onDemand: false,
          stock: "0",
          supplierId: "",
          payoutMode: "fixed",
          payoutValue: "",
        },
  });
  const onDemand = watch("onDemand");
  const supplierId = watch("supplierId");
  const payoutMode = watch("payoutMode");
  const payoutValue = watch("payoutValue");
  const priceCents = parseAmount(watch("price") ?? "") ?? 0;
  const feeBps = connect?.applicationFeeBps ?? 500;
  const payoutCents = supplierId ? payoutUnitCents(payoutMode, payoutValue, priceCents) : 0;
  // um parceiro desativado que ainda está no produto continua na lista: sair dela sem
  // querer apagaria o acordo no primeiro salvamento
  const supplierOptions: Array<{ id: string; name: string }> = (() => {
    const list = (suppliers?.items ?? []).map((item) => ({ id: item.id, name: item.name }));
    const current = product?.payout;
    if (current && !list.some((item) => item.id === current.supplierId)) {
      return [...list, { id: current.supplierId, name: `${current.supplierName} (desativado)` }];
    }
    return list;
  })();
  const breakdown =
    supplierId && priceCents > 0 && payoutCents !== null
      ? payoutBreakdown(priceCents, payoutCents, feeBps)
      : null;

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
      return true;
    } catch (error) {
      setFormError(
        error instanceof Error && error.message === "upload_failed"
          ? "A foto não subiu. Tente de novo."
          : errorMessage(error),
      );
    } finally {
      setUploading(false);
    }
    return false;
  }

  async function addFiles(files: FileList | File[]) {
    // uma por vez para manter a ordem; um erro interrompe as seguintes
    for (const file of Array.from(files)) {
      const ok = await pickImage(file);
      if (!ok) break;
    }
  }

  async function submit(values: ProductForm) {
    setFormError(null);
    const priceCents = parseAmount(values.price);
    if (priceCents === null || priceCents <= 0) {
      setFormError("Preço inválido. Escreva como no dia a dia: 45 ou 45,90.");
      return;
    }
    // o acordo de repasse vai inteiro ou não vai: limpar é mandar null nos três campos
    let payoutPatch = {};
    if (canPayout) {
      if (!values.supplierId) {
        payoutPatch = { supplierId: null, payoutKind: null, payoutValue: null };
      } else {
        const value = payoutValueForApi(values.payoutMode, values.payoutValue);
        const unit = payoutUnitCents(values.payoutMode, values.payoutValue, priceCents);
        if (value === null || unit === null) {
          setFormError(
            values.payoutMode === "fixed"
              ? "Diga quanto vai para o parceiro em cada unidade: 20 ou 20,50."
              : "A porcentagem do parceiro tem que ficar entre 0 e 100.",
          );
          return;
        }
        if (priceCents - Math.floor((priceCents * feeBps) / 10000) - unit < 0) {
          setFormError(
            "Esse repasse é maior do que o valor que chega na conta da loja. Diminua o repasse ou aumente o preço.",
          );
          return;
        }
        payoutPatch = {
          supplierId: values.supplierId,
          payoutKind: values.payoutMode === "fixed" ? "fixed_cents" : "percent_bps",
          payoutValue: value,
        };
      }
    }
    const payload = {
      name: values.name,
      description: values.description || undefined,
      priceCents,
      images: images.map((image) => image.key),
      stock: values.onDemand ? 0 : Math.max(0, Number.parseInt(values.stock || "0", 10) || 0),
      availability: values.onDemand ? ("on_demand" as const) : ("in_stock" as const),
      ...payoutPatch,
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
      toast("Produto arquivado.");
      await onDone();
    } catch (error) {
      setFormError(errorMessage(error));
      setArchiving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {product ? `Editar ${product.name}` : "Novo produto"}
        </h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Voltar
        </Button>
      </div>

      <form onSubmit={handleSubmit(submit)} className="mt-6 grid gap-8">
        <section className="grid gap-5">
          <h3 className="kicker">Sobre o produto</h3>

          <div className="grid gap-5 md:grid-cols-2">
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
          </div>

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
        </section>

        <section className="grid gap-5">
          <h3 className="kicker">Estoque</h3>

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
        </section>

        {canPayout && (
          <section className="grid gap-5">
            <div>
              <h3 className="kicker">Repasse</h3>
              <p className="mt-2 text-muted text-sm">
                Se este produto é feito por outra pessoa, diga quanto do preço é dela. O dinheiro da
                venda cai na conta da loja e o valor combinado fica registrado como repasse a pagar.
              </p>
            </div>

            {supplierOptions.length === 0 ? (
              <p className="text-muted text-sm">
                Você ainda não cadastrou ninguém.{" "}
                <Link
                  to="/gestao/$slug/repasses"
                  params={{ slug }}
                  className="text-brand-deep underline underline-offset-4"
                >
                  Cadastrar um parceiro
                </Link>{" "}
                leva menos de um minuto — depois volte aqui para combinar o valor.
              </p>
            ) : (
              <>
                <Field label="Quem recebe parte deste produto" htmlFor="supplierId">
                  <Select id="supplierId" {...register("supplierId")}>
                    <option value="">Ninguém — a loja fica com tudo</option>
                    {supplierOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                {supplierId && (
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Como combinar" htmlFor="payoutMode">
                      <Select id="payoutMode" {...register("payoutMode")}>
                        <option value="fixed">Valor fixo por unidade</option>
                        <option value="percent">Porcentagem do preço</option>
                      </Select>
                    </Field>
                    <Field
                      label={payoutMode === "fixed" ? "Valor por unidade" : "Porcentagem"}
                      htmlFor="payoutValue"
                      hint={
                        payoutMode === "fixed"
                          ? "Quanto a pessoa recebe por peça vendida"
                          : "Quanto do preço é da pessoa, de 0 a 100"
                      }
                    >
                      <Input
                        id="payoutValue"
                        inputMode="decimal"
                        placeholder={payoutMode === "fixed" ? "R$ 0,00" : "50"}
                        {...register("payoutValue")}
                      />
                    </Field>
                  </div>
                )}

                {supplierId && breakdown && (
                  <dl className="card grid gap-2 p-4 text-sm tabular-nums">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-muted">Preço para quem compra</dt>
                      <dd className="font-medium">{money(breakdown.priceCents)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-muted">Repasse do parceiro</dt>
                      <dd className="font-medium">{money(breakdown.payoutCents)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-muted">
                        Taxa da plataforma ({formatPercentFromBps(feeBps)})
                      </dt>
                      <dd className="font-medium">{money(breakdown.feeCents)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 border-line border-t pt-2">
                      <dt className="font-medium text-ink">Fica com a loja</dt>
                      <dd
                        className={`font-semibold ${
                          breakdown.storeCents < 0 ? "text-danger" : "text-ink"
                        }`}
                      >
                        {money(breakdown.storeCents)}
                      </dd>
                    </div>
                    {breakdown.storeCents < 0 && (
                      <p className="text-danger">
                        Assim a loja paga para vender. Diminua o repasse ou aumente o preço.
                      </p>
                    )}
                  </dl>
                )}
              </>
            )}
          </section>
        )}

        <section className="grid gap-3">
          <h3 className="kicker">Fotos</h3>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {images.map((image) => (
                <span key={image.key} className="relative">
                  <img
                    src={image.url}
                    alt=""
                    className="aspect-square w-full rounded-[0.9rem] border border-line bg-surface object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remover foto"
                    onClick={() =>
                      setImages((current) =>
                        current.filter((candidate) => candidate.key !== image.key),
                      )
                    }
                    className="-top-2 -right-2 absolute inline-grid h-7 w-7 place-items-center rounded-full border border-line bg-elevated text-muted shadow-sm hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          )}

          <label
            onDragEnter={(event) => {
              event.preventDefault();
              dragDepth.current += 1;
              setDragOver(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => {
              dragDepth.current = Math.max(0, dragDepth.current - 1);
              if (dragDepth.current === 0) setDragOver(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              dragDepth.current = 0;
              setDragOver(false);
              if (!uploading && event.dataTransfer.files.length > 0) {
                void addFiles(event.dataTransfer.files);
              }
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[1rem] border-2 border-dashed px-4 py-8 text-center transition-colors [transition-duration:var(--dur)] ${
              dragOver ? "border-brand bg-brand-soft/60" : "border-line hover:border-line-strong"
            }`}
          >
            <ImagePlus className="h-6 w-6 text-muted" aria-hidden />
            <span className="font-medium text-ink text-sm">
              {uploading ? "Enviando foto…" : "Arraste as fotos aqui"}
            </span>
            <span className="text-muted text-xs">ou toque para escolher · JPG, PNG, WebP</span>
            <input
              type="file"
              multiple
              accept={ACCEPTED_TYPES.join(",")}
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                const files = event.target.files;
                if (files && files.length > 0) void addFiles(Array.from(files));
                event.target.value = "";
              }}
            />
          </label>
        </section>

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
          Ele sai da vitrine na hora e não recebe novas compras. Nada é apagado: pedidos, fotos e
          histórico ficam salvos, e você pode restaurar quando quiser.
        </ConfirmDialog>
      </form>
    </div>
  );
}
