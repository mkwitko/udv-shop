import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Archive, Pencil, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AiDescription } from "#/components/store/ai-text";
import { CategoryManager } from "#/components/store/category-manager";
import { Button } from "#/components/ui/button";
import { ChoiceCard } from "#/components/ui/choice-card";
import { ConfirmDialog } from "#/components/ui/confirm";
import { EmptyState } from "#/components/ui/empty-state";
import { Field, FormError, Input, Select, Textarea } from "#/components/ui/field";
import { ImagePicker, type PickedImage } from "#/components/ui/image-picker";
import { MoneyInput } from "#/components/ui/money-input";
import { SkeletonRows } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { archiveProduct } from "#/lib/api/gen/clients/archiveProduct";
import { createCategory } from "#/lib/api/gen/clients/createCategory";
import { createProduct } from "#/lib/api/gen/clients/createProduct";
import { restoreProduct } from "#/lib/api/gen/clients/restoreProduct";
import { updateProduct } from "#/lib/api/gen/clients/updateProduct";
import { useGetConnectStatus } from "#/lib/api/gen/hooks/useGetConnectStatus";
import { listCategoriesQueryKey, useListCategories } from "#/lib/api/gen/hooks/useListCategories";
import { useListMyStores } from "#/lib/api/gen/hooks/useListMyStores";
import { listProductsQueryKey, useListProducts } from "#/lib/api/gen/hooks/useListProducts";
import { useListSuppliers } from "#/lib/api/gen/hooks/useListSuppliers";
import type { ListProducts200 } from "#/lib/api/gen/types/ListProducts";
import { dateTime, money } from "#/lib/format";
import { maskAmountInput, parseAmount } from "#/lib/pay/amount";
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
  /** Vazio = produto sem gaveta. A vitrine mostra ele em "Tudo". */
  categoryId: z.string(),
  /** Valor de `<input type="datetime-local">`: "2026-10-12T20:00". Vazio = não é evento. */
  eventAt: z.string(),
  eventEndsAt: z.string(),
  eventLocation: z.string(),
  // repasse: parceiro vazio significa "a loja fica com tudo"
  supplierId: z.string(),
  payoutMode: z.enum(["fixed", "percent"]),
  payoutValue: z.string(),
});
type ProductForm = z.infer<typeof ProductSchema>;

// `all: "true"` traz também os arquivados — a gestão precisa ver o que tirou do ar
// para poder trazer de volta. A vitrine pública continua chamando sem esse parâmetro.
// `kind: "todos"` porque para quem cuida da loja evento É produto: aparece na mesma lista,
// marcado com a data. A vitrine é que separa os dois.
const LIST_QUERY = { limit: 50, all: "true", kind: "todos" } as const;

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
                      {/* Evento se identifica pela data, não pelo estoque: quem procura
                          "a festa de sábado" na lista precisa ver a data aqui. */}
                      {product.event && <Tag tone="brand">{dateTime(product.event.at)}</Tag>}
                      {product.availability === "on_demand" ? (
                        <Tag tone="brand">sob encomenda</Tag>
                      ) : product.stock <= 0 ? (
                        <Tag tone="accent">{product.event ? "lotado" : "esgotado"}</Tag>
                      ) : (
                        <span>
                          {product.stock} {product.event ? "vagas" : "em estoque"}
                        </span>
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

      {/* categorias moram aqui porque são decisão de vitrine, não de configuração:
          quem está cadastrando produto é quem decide as gavetas */}
      <div className="rule mt-12 pt-8">
        <CategoryManager slug={slug} />
      </div>
    </div>
  );
}

/** Volta do formato da API para o que a pessoa digitou: centavos ou porcentagem. */
function payoutValueToInput(payout: Product["payout"]): string {
  if (!payout) return "";
  // valor fixo já entra mascarado — o campo é MoneyInput e um "45,90" cru ficaria
  // fora do formato que a máscara escreve.
  return payout.kind === "percent_bps"
    ? String(payout.value / 100).replace(".", ",")
    : maskAmountInput(String(payout.value));
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

/**
 * ISO do servidor → valor de `<input type="datetime-local">`, no fuso de quem edita. O
 * input não aceita ISO com Z; sem esta conversão o campo abre vazio ao editar um evento.
 */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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
  const [images, setImages] = useState<PickedImage[]>(
    product ? product.images.map((key, i) => ({ key, url: product.imageUrls[i] ?? "" })) : [],
  );
  const [uploading, setUploading] = useState(false);
  const [archiving, setArchiving] = useState(false);

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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(ProductSchema),
    defaultValues: product
      ? {
          name: product.name,
          price: maskAmountInput(String(product.priceCents)),
          description: product.description ?? undefined,
          stock: String(product.stock),
          onDemand: product.availability === "on_demand",
          categoryId: product.category?.id ?? "",
          eventAt: toLocalInput(product.event?.at),
          eventEndsAt: toLocalInput(product.event?.endsAt),
          eventLocation: product.event?.location ?? "",
          supplierId: product.payout?.supplierId ?? "",
          payoutMode: product.payout?.kind === "percent_bps" ? "percent" : "fixed",
          payoutValue: payoutValueToInput(product.payout),
        }
      : {
          onDemand: false,
          stock: "0",
          categoryId: "",
          eventAt: "",
          eventEndsAt: "",
          eventLocation: "",
          supplierId: "",
          payoutMode: "fixed",
          payoutValue: "",
        },
  });
  const onDemand = watch("onDemand");
  // Editar evento já criado abre com a seção aberta; produto comum abre fechada.
  const [isEvent, setIsEvent] = useState(product?.event != null);
  const supplierId = watch("supplierId");
  const payoutMode = watch("payoutMode");
  const payoutValue = watch("payoutValue");
  const priceCents = parseAmount(watch("price") ?? "") ?? 0;
  // zero é o default de verdade (ADR-027: a plataforma vive da mensalidade). Com `?? 500`
  // aqui, o cálculo de repasse mostrava 5% de comissão inexistente enquanto o status
  // carregava — o dono via menos dinheiro do que recebe.
  const feeBps = connect?.applicationFeeBps ?? 0;
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

  async function submit(values: ProductForm) {
    setFormError(null);
    const priceCents = parseAmount(values.price);
    if (priceCents === null || priceCents <= 0) {
      setFormError("Coloque um preço maior que zero.");
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
    // "2026-10-12T20:00" no fuso de quem digita → instante absoluto. `new Date` de um
    // datetime-local já interpreta como hora local, que é exatamente a intenção de quem
    // escreveu "sábado às 20h".
    let eventPatch: Record<string, string | null> = {};
    if (isEvent) {
      if (!values.eventAt) {
        setFormError("Diga o dia e a hora do evento.");
        return;
      }
      const at = new Date(values.eventAt);
      const endsAt = values.eventEndsAt ? new Date(values.eventEndsAt) : null;
      if (Number.isNaN(at.getTime()) || (endsAt && Number.isNaN(endsAt.getTime()))) {
        setFormError("Data inválida. Confira o dia e a hora.");
        return;
      }
      if (endsAt && endsAt.getTime() <= at.getTime()) {
        setFormError("O fim do evento tem que ser depois do começo.");
        return;
      }
      eventPatch = {
        eventAt: at.toISOString(),
        eventEndsAt: endsAt ? endsAt.toISOString() : null,
        eventLocation: values.eventLocation.trim() || null,
      };
    } else {
      // desmarcar devolve o ingresso para a vitrine: os três campos são limpos juntos
      eventPatch = { eventAt: null, eventEndsAt: null, eventLocation: null };
    }
    const payload = {
      name: values.name,
      description: values.description || undefined,
      priceCents,
      images: images.map((image) => image.key),
      stock: values.onDemand ? 0 : Math.max(0, Number.parseInt(values.stock || "0", 10) || 0),
      availability: values.onDemand ? ("on_demand" as const) : ("in_stock" as const),
      // string vazia é "sem categoria": a API espera null, não ""
      categoryId: values.categoryId || null,
      ...eventPatch,
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
              hint="Digite só os números: 4590 fica R$ 45,90"
              error={errors.price?.message}
            >
              <MoneyInput id="price" {...register("price")} />
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

          <AiDescription
            slug={slug}
            name={watch("name") ?? ""}
            description={watch("description") ?? ""}
            onApply={(text) =>
              setValue("description", text, { shouldDirty: true, shouldValidate: true })
            }
          />

          <CategoryField
            slug={slug}
            value={watch("categoryId") ?? ""}
            onChange={(id) => setValue("categoryId", id, { shouldDirty: true })}
          />
        </section>

        {/* Foto é o que vende e é o que a pessoa quer fazer primeiro: subiu para logo
            depois de nome e preço. No fim do formulário, atrás de estoque e repasse, ela
            ficava abaixo da dobra e muito produto nascia sem imagem. */}
        <section className="grid gap-3">
          <h3 className="kicker">Fotos</h3>

          <ImagePicker
            storeSlug={slug}
            images={images}
            onChange={setImages}
            onUploadingChange={setUploading}
            onError={setFormError}
          />
        </section>

        {/* Evento é produto com data: a mesma tela cadastra os dois, e apagar a data devolve
            o ingresso para a vitrine como produto comum. */}
        <section className="grid gap-5">
          <h3 className="kicker">Evento</h3>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 accent-(--brand)"
              checked={isEvent}
              onChange={(item) => {
                setIsEvent(item.target.checked);
                if (!item.target.checked) {
                  setValue("eventAt", "", { shouldDirty: true });
                  setValue("eventEndsAt", "", { shouldDirty: true });
                  setValue("eventLocation", "", { shouldDirty: true });
                }
              }}
            />
            <span>
              <span className="font-medium text-ink">Isto tem dia e hora</span>
              <span className="block text-muted">
                Sessão, festa, mutirão, curso. Entra na Agenda da loja em vez da vitrine, e o
                estoque passa a ser o número de vagas.
              </span>
            </span>
          </label>

          {isEvent && (
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Quando começa"
                htmlFor="eventAt"
                hint="Dia e hora."
                error={errors.eventAt?.message}
              >
                <Input id="eventAt" type="datetime-local" {...register("eventAt")} />
              </Field>
              <Field
                label="Quando termina (opcional)"
                htmlFor="eventEndsAt"
                hint="Enquanto não terminar, continua na Agenda."
                error={errors.eventEndsAt?.message}
              >
                <Input id="eventEndsAt" type="datetime-local" {...register("eventEndsAt")} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Onde" htmlFor="eventLocation" error={errors.eventLocation?.message}>
                  <Input
                    id="eventLocation"
                    placeholder="Salão do núcleo, Estrada do Sítio, km 4"
                    {...register("eventLocation")}
                  />
                </Field>
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-5">
          <h3 className="kicker">{isEvent ? "Vagas" : "Estoque"}</h3>

          {/* Era um checkbox "feito sob encomenda" com três frases de explicação dentro do
              label — a decisão que mais confundia no cadastro. Duas opções, uma linha cada:
              a pessoa escolhe entre dois mundos que ela reconhece. Evento não escolhe:
              ingresso é sempre pronto, o que varia é quantas vagas sobraram. */}
          <fieldset className={`grid gap-2 ${isEvent ? "hidden" : ""}`}>
            <legend className="mb-1.5 font-medium text-ink text-sm">
              Você já tem esse produto pronto?
            </legend>
            <ChoiceCard
              name="onDemand"
              checked={!onDemand}
              onSelect={() => setValue("onDemand", false, { shouldDirty: true })}
              title="Já tenho pronto"
              detail="Vende na hora, com botão de comprar. Você diz quantos tem."
            />
            <ChoiceCard
              name="onDemand"
              checked={onDemand}
              onSelect={() => setValue("onDemand", true, { shouldDirty: true })}
              title="Faço depois do pedido"
              detail="Sem botão de comprar: quem quiser entra numa fila e você combina um por um."
            />
          </fieldset>
          {/* o campo continua registrado no form; o par de opções só escreve nele */}
          <input type="checkbox" className="hidden" {...register("onDemand")} />

          {!onDemand && (
            <Field
              label={isEvent ? "Quantas vagas?" : "Quantos você tem agora?"}
              htmlFor="stock"
              hint={
                isEvent
                  ? "Cada ingresso vendido tira uma vaga. Chegando a zero o evento aparece como lotado e quem quiser entra na fila de espera."
                  : "Chegando a zero o produto aparece como esgotado e quem quiser entra na fila. Volta a vender sozinho quando você repõe."
              }
              error={errors.stock?.message}
            >
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
                      {/* percentual não é dinheiro: máscara de R$ só no modo fixo */}
                      {payoutMode === "fixed" ? (
                        <MoneyInput id="payoutValue" {...register("payoutValue")} />
                      ) : (
                        <Input
                          id="payoutValue"
                          inputMode="decimal"
                          placeholder="50"
                          {...register("payoutValue")}
                        />
                      )}
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
                    {/* linha só existe quando a loja realmente paga comissão: com fee
                        zero (o normal hoje) ela era uma linha de R$ 0,00 pedindo
                        explicação */}
                    {feeBps > 0 && (
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-muted">
                          Taxa da plataforma ({formatPercentFromBps(feeBps)})
                        </dt>
                        <dd className="font-medium">{money(breakdown.feeCents)}</dd>
                      </div>
                    )}
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

        <FormError>{formError}</FormError>

        <Button size="lg" type="submit" disabled={isSubmitting || uploading}>
          {isSubmitting ? "Salvando…" : product ? "Salvar alterações" : "Publicar produto"}
        </Button>

        {product && (
          // link sublinhado escondia uma ação que muda a vitrine; virou botão com o
          // efeito escrito ao lado, e continua longe do "Salvar" para não ser clique torto
          <div className="rule mt-2 grid gap-2 pt-5">
            <h3 className="kicker">Tirar do ar</h3>
            <p className="max-w-[52ch] text-muted text-sm">
              Arquivar remove o produto da vitrine na hora e ele para de receber compras. Nada é
              apagado: pedidos, fotos e histórico ficam salvos e você pode restaurar quando quiser.
            </p>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="justify-self-start"
              onClick={() => setConfirmArchive(true)}
              disabled={archiving}
            >
              <Archive className="h-4 w-4" aria-hidden />
              {archiving ? "Tirando do ar…" : "Arquivar produto"}
            </Button>
          </div>
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

/**
 * Categoria do produto, com atalho para criar uma nova sem sair do formulário — obrigar
 * a ir até a lista, criar, voltar e digitar tudo de novo é como se perde um cadastro.
 */
function CategoryField({
  slug,
  value,
  onChange,
}: {
  slug: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const { queryClient } = useRouter().options.context;
  const { data } = useListCategories(slug);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categories = data?.items ?? [];

  async function create() {
    if (name.trim().length < 2) {
      setError("Escreva um nome com pelo menos duas letras.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createCategory(slug, { name: name.trim() });
      await queryClient.invalidateQueries({ queryKey: listCategoriesQueryKey(slug) });
      // já entra selecionada: criar uma gaveta e não guardar o produto nela seria estranho
      onChange(created.id);
      setName("");
      setCreating(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Field
        label="Categoria (opcional)"
        htmlFor="categoryId"
        hint="É por ela que as pessoas filtram a vitrine."
      >
        <Select id="categoryId" value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Sem categoria</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>

      {creating ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            // foco automático: o campo só existe porque a pessoa pediu para criar
            autoFocus
            aria-label="Nome da nova categoria"
            className="h-11 min-w-[10rem] flex-1"
            placeholder="Chás"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void create();
              }
              if (event.key === "Escape") setCreating(false);
            }}
          />
          <Button type="button" size="sm" disabled={busy} onClick={() => void create()}>
            {busy ? "Criando…" : "Criar e usar"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="justify-self-start text-brand-deep text-sm underline underline-offset-4"
          onClick={() => setCreating(true)}
        >
          + Criar categoria
        </button>
      )}

      <FormError>{error}</FormError>
    </div>
  );
}
