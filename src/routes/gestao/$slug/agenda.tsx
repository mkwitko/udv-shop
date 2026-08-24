import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArchiveRestore,
  CalendarDays,
  Check,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { AiDescription } from "#/components/store/ai-text";
import { Button } from "#/components/ui/button";
import { EmptyState } from "#/components/ui/empty-state";
import { Field, FormError, Input, Select, Textarea } from "#/components/ui/field";
import { ImagePicker, type PickedImage } from "#/components/ui/image-picker";
import { MoneyInput } from "#/components/ui/money-input";
import { ShareButton } from "#/components/ui/share-button";
import { SkeletonRows } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { archiveEvent } from "#/lib/api/gen/clients/archiveEvent";
import { checkInAttendee } from "#/lib/api/gen/clients/checkInAttendee";
import { createEvent } from "#/lib/api/gen/clients/createEvent";
import { restoreEvent } from "#/lib/api/gen/clients/restoreEvent";
import { updateEvent } from "#/lib/api/gen/clients/updateEvent";
import { useGetConnectStatus } from "#/lib/api/gen/hooks/useGetConnectStatus";
import {
  listEventAttendeesQueryKey,
  useListEventAttendees,
} from "#/lib/api/gen/hooks/useListEventAttendees";
import { useListMyStores } from "#/lib/api/gen/hooks/useListMyStores";
import {
  listStoreEventsQueryKey,
  useListStoreEvents,
} from "#/lib/api/gen/hooks/useListStoreEvents";
import { useListSuppliers } from "#/lib/api/gen/hooks/useListSuppliers";
import type { ListStoreEvents200 } from "#/lib/api/gen/types/ListStoreEvents";
import { dateTime, formatStoredPhone, money, toLocalInput, weekday } from "#/lib/format";
import { maskAmountInput, parseAmount } from "#/lib/pay/amount";
import {
  formatPercentFromBps,
  payoutBreakdown,
  payoutUnitCents,
  payoutValueForApi,
  payoutValueToInput,
} from "#/lib/payout";
import { slugify } from "#/lib/slug";
import { whatsappUrl } from "#/lib/whatsapp";

export const Route = createFileRoute("/gestao/$slug/agenda")({
  component: AgendaAdmin,
});

type Event = ListStoreEvents200["items"][number];

// `all: "true"` traz o que já passou e o que foi arquivado: a lista de presença de ontem
// mora aqui, e evento arquivado precisa de caminho de volta.
const LIST_QUERY = { limit: 50, all: "true" } as const;

const EventSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(120),
  /**
   * Sem `min(1)` de propósito: com lotes o campo nem aparece na tela, e um erro de campo
   * escondido faz o formulário travar sem dizer por quê. Quem cobra o valor é o `submit`,
   * que sabe se o preço vem do evento ou do primeiro lote.
   */
  price: z.string(),
  description: z.string().max(2000).optional(),
  seats: z.string().optional(),
  /** Valor de `<input type="datetime-local">`: "2026-10-12T20:00". */
  at: z.string().min(1, "Diga o dia e a hora"),
  /** Lotes em edição. Lista vazia é evento de preço único. */
  batches: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      price: z.string(),
      seats: z.string(),
      opensAt: z.string(),
      closesAt: z.string(),
    }),
  ),
  endsAt: z.string(),
  location: z.string(),
  // repasse: parceiro vazio significa "a loja fica com tudo"
  supplierId: z.string(),
  payoutMode: z.enum(["fixed", "percent"]),
  payoutValue: z.string(),
});
type EventForm = z.infer<typeof EventSchema>;

/**
 * Eventos da loja: o que vai acontecer, quem garantiu vaga e quem chegou. É a tela que fica
 * aberta na porta — e, desde que evento saiu de dentro de produto (ADR-028), também é onde
 * ele nasce. O bloco na navegação se chama Eventos porque para quem cuida da loja isto é
 * fonte de receita com vaga para vender; esta tela dentro dele é a agenda, e a de Resultado
 * é quanto cada evento deu.
 */
function AgendaAdmin() {
  const { slug } = Route.useParams();
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useListStoreEvents(slug, LIST_QUERY);
  const [editing, setEditing] = useState<Event | "new" | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const toast = useToast();
  const events = data?.items ?? [];

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: listStoreEventsQueryKey(slug, LIST_QUERY) });
  }

  async function restore(event: Event) {
    setListError(null);
    try {
      await restoreEvent(slug, event.slug);
      await refresh();
      toast(`${event.name} está de volta no ar.`);
    } catch (cause) {
      setListError(errorMessage(cause));
    }
  }

  if (editing) {
    return (
      <EventForm
        slug={slug}
        event={editing === "new" ? null : editing}
        onCancel={() => setEditing(null)}
        onDone={async (message) => {
          setEditing(null);
          await refresh();
          toast(message);
        }}
      />
    );
  }

  if (isPending) return <SkeletonRows rows={3} />;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-lg tracking-tight">Agenda</h2>
          <p className="mt-1 text-muted text-sm">
            Sessão, festa, mutirão, curso: o que tem dia, hora e vaga para vender. Cada vaga vendida
            sai da conta, e a lista de presença fica aqui.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" aria-hidden />
          Criar evento
        </Button>
      </div>

      <FormError>{listError}</FormError>

      {events.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<CalendarDays className="h-6 w-6" aria-hidden />}
          title="Nada marcado por aqui."
        >
          Crie o primeiro evento e ele aparece na página da loja, com a lista de quem garantiu vaga.
        </EmptyState>
      ) : (
        <ul className="mt-6 grid gap-3">
          {events.map((event) => {
            const isOpen = open === event.slug;
            return (
              <li key={event.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  {/* no celular os botões descem para uma linha só deles: com eles na mesma
                      linha, o nome do evento era espremido numa coluna de uma palavra */}
                  <div className="min-w-[12rem] flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-semibold">{event.name}</span>
                      {!event.active && <Tag>arquivado</Tag>}
                      {/* "já passou" antes de "lotado": um evento de ontem lotado não é
                          problema de vaga, é história. */}
                      {event.finished ? (
                        <Tag>já passou</Tag>
                      ) : (
                        event.seats <= 0 && <Tag tone="accent">lotado</Tag>
                      )}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted text-sm">
                      <span>{weekday(event.at)}</span>
                      <span className="tabular-nums">{dateTime(event.at)}</span>
                      <span className="tabular-nums">{money(event.priceCents)}</span>
                      {/* com lotes, o preço acima é o do lote que está vendendo: dizer qual
                          é evita a loja achar que alguém pagou o valor errado */}
                      {event.batch && <span>{event.batch.name}</span>}
                      {!event.finished && (
                        <span className="tabular-nums">
                          {event.seats} {event.seats === 1 ? "vaga livre" : "vagas livres"}
                          {event.batch && event.seatsTotalLeft > event.seats
                            ? ` de ${event.seatsTotalLeft}`
                            : ""}
                        </span>
                      )}
                      {event.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          {event.location}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setOpen(isOpen ? null : event.slug)}
                    >
                      {isOpen ? "Fechar lista" : "Lista de presença"}
                    </Button>
                    {/* Compartilhar é como evento de comunidade enche: o link vai para o
                        grupo e a pessoa compra ali mesmo. Só faz sentido no que está no ar. */}
                    {event.active && !event.finished && (
                      <ShareButton
                        title={event.name}
                        path={`/loja/${slug}/e/${event.slug}`}
                        label="Compartilhar"
                        text={`${event.name} — ${weekday(event.at)}, ${dateTime(event.at)}`}
                        variant="ghost"
                        size="sm"
                      />
                    )}
                    {event.active ? (
                      <Button variant="ghost" size="sm" onClick={() => setEditing(event)}>
                        <Pencil className="h-4 w-4" aria-hidden />
                        Editar
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => restore(event)}>
                        <ArchiveRestore className="h-4 w-4" aria-hidden />
                        Restaurar
                      </Button>
                    )}
                  </div>
                </div>
                {isOpen && <Attendees slug={slug} eventSlug={event.slug} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Cadastro do evento. Campos próprios: o que muda em relação a produto não é decoração —
 * é vaga em vez de estoque, e dia/hora/lugar em vez de categoria.
 */
function EventForm({
  slug,
  event,
  onDone,
  onCancel,
}: {
  slug: string;
  event: Event | null;
  onDone: (message: string) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [images, setImages] = useState<PickedImage[]>(
    event ? event.images.map((key, i) => ({ key, url: event.imageUrls[i] ?? "" })) : [],
  );
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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
    control,
    formState: { errors, isSubmitting },
  } = useForm<EventForm>({
    resolver: zodResolver(EventSchema),
    defaultValues: event
      ? {
          name: event.name,
          price: maskAmountInput(String(event.priceCents)),
          description: event.description ?? undefined,
          seats: String(event.seats),
          at: toLocalInput(event.at),
          endsAt: toLocalInput(event.endsAt),
          location: event.location ?? "",
          supplierId: event.payout?.supplierId ?? "",
          payoutMode: event.payout?.kind === "percent_bps" ? "percent" : "fixed",
          payoutValue: payoutValueToInput(event.payout),
          batches: event.batches.map((batch) => ({
            id: batch.id,
            name: batch.name,
            price: maskAmountInput(String(batch.priceCents)),
            seats: String(batch.seats),
            opensAt: toLocalInput(batch.opensAt),
            closesAt: toLocalInput(batch.closesAt),
          })),
        }
      : {
          seats: "20",
          at: "",
          endsAt: "",
          location: "",
          supplierId: "",
          payoutMode: "fixed",
          payoutValue: "",
          batches: [],
        },
  });
  const {
    fields: batchFields,
    append: appendBatch,
    remove: removeBatch,
  } = useFieldArray({
    control,
    name: "batches",
  });
  const usaLotes = batchFields.length > 0;
  const supplierId = watch("supplierId");
  const payoutMode = watch("payoutMode");
  const payoutValue = watch("payoutValue");
  const priceCents = parseAmount(watch("price") ?? "") ?? 0;
  // zero é o default de verdade (ADR-027: a plataforma vive da mensalidade)
  const feeBps = connect?.applicationFeeBps ?? 0;
  const payoutCents = supplierId ? payoutUnitCents(payoutMode, payoutValue, priceCents) : 0;
  // um parceiro desativado que ainda está no evento continua na lista: sair dela sem querer
  // apagaria o acordo no primeiro salvamento
  const supplierOptions: Array<{ id: string; name: string }> = (() => {
    const list = (suppliers?.items ?? []).map((item) => ({ id: item.id, name: item.name }));
    const current = event?.payout;
    if (current && !list.some((item) => item.id === current.supplierId)) {
      return [...list, { id: current.supplierId, name: `${current.supplierName} (desativado)` }];
    }
    return list;
  })();
  const breakdown =
    supplierId && priceCents > 0 && payoutCents !== null
      ? payoutBreakdown(priceCents, payoutCents, feeBps)
      : null;

  async function submit(values: EventForm) {
    setFormError(null);
    // Com lotes, quem manda no preço é o lote: o campo do evento nem aparece na tela, e o
    // valor gravado nele é o do primeiro lote — serve de referência se a loja apagar os
    // lotes depois.
    const priceCents = usaLotes
      ? parseAmount(values.batches[0]?.price ?? "")
      : parseAmount(values.price ?? "");
    if (!priceCents) {
      setFormError(usaLotes ? "Informe o valor do primeiro lote." : "Informe o valor da vaga.");
      return;
    }
    // "2026-10-12T20:00" no fuso de quem digita → instante absoluto. `new Date` de um
    // datetime-local já interpreta como hora local, que é a intenção de quem escreveu
    // "sábado às 20h".
    const at = new Date(values.at);
    const endsAt = values.endsAt ? new Date(values.endsAt) : null;
    if (Number.isNaN(at.getTime()) || (endsAt && Number.isNaN(endsAt.getTime()))) {
      setFormError("Data inválida. Confira o dia e a hora.");
      return;
    }
    if (endsAt && endsAt.getTime() <= at.getTime()) {
      setFormError("O fim do evento tem que ser depois do começo.");
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
              ? "Diga quanto vai para quem conduz em cada vaga: 20 ou 20,50."
              : "A porcentagem de quem conduz tem que ficar entre 0 e 100.",
          );
          return;
        }
        if (priceCents - Math.floor((priceCents * feeBps) / 10000) - unit < 0) {
          setFormError(
            "Esse repasse é maior do que o valor que chega na conta da loja. Diminua o repasse ou aumente o valor da vaga.",
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

    // Lotes: preço e vagas passam a viver neles, e o preço do evento fica só como o valor
    // que valeria sem lote nenhum. A tela some com os campos do evento para ninguém
    // preencher dois preços e achar que os dois valem.
    const batches = values.batches.map((batch) => ({
      ...(batch.id ? { id: batch.id } : {}),
      name: batch.name.trim(),
      priceCents: parseAmount(batch.price) ?? 0,
      seats: Math.max(0, Number.parseInt(batch.seats || "0", 10) || 0),
      opensAt: batch.opensAt ? new Date(batch.opensAt).toISOString() : null,
      closesAt: batch.closesAt ? new Date(batch.closesAt).toISOString() : null,
    }));
    for (const [index, batch] of batches.entries()) {
      if (!batch.name) {
        setFormError(`Dê um nome ao ${index + 1}º lote — "1º lote" já serve.`);
        return;
      }
      if (batch.priceCents <= 0) {
        setFormError(`Informe o valor do lote "${batch.name}".`);
        return;
      }
      if (batch.closesAt && batch.opensAt && batch.closesAt <= batch.opensAt) {
        setFormError(`No lote "${batch.name}", o fim tem que ser depois do começo.`);
        return;
      }
    }

    const payload = {
      name: values.name,
      description: values.description || undefined,
      priceCents,
      images: images.map((image) => image.key),
      seats: Math.max(0, Number.parseInt(values.seats || "0", 10) || 0),
      batches,
      at: at.toISOString(),
      endsAt: endsAt ? endsAt.toISOString() : null,
      location: values.location.trim() || null,
      ...payoutPatch,
    };

    try {
      if (event) {
        await updateEvent(slug, event.slug, payload);
      } else {
        await createEvent(slug, { ...payload, slug: slugify(values.name) });
      }
      await onDone(event ? "Evento salvo." : "Evento criado e já na página da loja.");
    } catch (cause) {
      setFormError(errorMessage(cause));
    }
  }

  async function archive() {
    if (!event) return;
    setArchiving(true);
    setFormError(null);
    try {
      await archiveEvent(slug, event.slug);
      await onDone(
        "Evento arquivado. Ele sai da página da loja, e a lista de presença fica guardada.",
      );
    } catch (cause) {
      setFormError(errorMessage(cause));
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div>
      <div>
        <h2 className="font-display font-semibold text-lg tracking-tight">
          {event ? "Editar evento" : "Novo evento"}
        </h2>
        <p className="mt-1 text-muted text-sm">
          Quem compra garante vaga e entra na lista de presença.
        </p>
      </div>

      <form onSubmit={handleSubmit(submit)} className="mt-6 grid gap-8">
        <section className="grid gap-5">
          <h3 className="kicker">Sobre o evento</h3>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Nome do evento" htmlFor="name" error={errors.name?.message}>
              <Input id="name" placeholder="Mutirão da horta" {...register("name")} />
            </Field>

            {!usaLotes && (
              <Field
                label="Valor por vaga"
                htmlFor="price"
                hint="Digite só os números: 4590 fica R$ 45,90"
                error={errors.price?.message}
              >
                <MoneyInput id="price" {...register("price")} />
              </Field>
            )}
          </div>

          <Field
            label="Descrição (opcional)"
            htmlFor="description"
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              rows={3}
              placeholder="O que vai acontecer, o que levar, quem conduz…"
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
        </section>

        <section className="grid gap-5">
          <h3 className="kicker">Quando e onde</h3>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Quando começa" htmlFor="at" hint="Dia e hora." error={errors.at?.message}>
              <Input id="at" type="datetime-local" {...register("at")} />
            </Field>
            <Field
              label="Quando termina (opcional)"
              htmlFor="endsAt"
              hint="Enquanto não terminar, continua aparecendo na loja."
              error={errors.endsAt?.message}
            >
              <Input id="endsAt" type="datetime-local" {...register("endsAt")} />
            </Field>
          </div>

          <Field label="Onde" htmlFor="location" error={errors.location?.message}>
            <Input
              id="location"
              placeholder="Salão do núcleo, Estrada do Sítio, km 4"
              {...register("location")}
            />
          </Field>
        </section>

        <section className="grid gap-5">
          <h3 className="kicker">Vagas</h3>

          {!usaLotes && (
            <Field
              label="Quantas vagas?"
              htmlFor="seats"
              hint="Cada vaga vendida sai da conta. Chegando a zero o evento aparece como lotado e quem quiser entra na fila de espera."
              error={errors.seats?.message}
            >
              <Input id="seats" type="number" min={0} inputMode="numeric" {...register("seats")} />
            </Field>
          )}

          {/* Lote é como evento de comunidade enche antes da hora: quem compra cedo paga
              menos. Vende um por vez, na ordem da lista — esgotou ou passou a data, o
              seguinte assume sozinho. */}
          {usaLotes && (
            <ul className="grid gap-4">
              {batchFields.map((field, index) => (
                <li key={field.id} className="rounded-[1rem] border border-line p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-sm">{index + 1}º a vender</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBatch(index)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Remover
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-4 md:grid-cols-3">
                    <Field label="Nome do lote" htmlFor={`batch-name-${index}`}>
                      <Input
                        id={`batch-name-${index}`}
                        placeholder="1º lote"
                        {...register(`batches.${index}.name`)}
                      />
                    </Field>
                    <Field label="Valor da vaga" htmlFor={`batch-price-${index}`}>
                      <MoneyInput
                        id={`batch-price-${index}`}
                        {...register(`batches.${index}.price`)}
                      />
                    </Field>
                    <Field label="Quantas vagas" htmlFor={`batch-seats-${index}`}>
                      <Input
                        id={`batch-seats-${index}`}
                        type="number"
                        min={0}
                        inputMode="numeric"
                        {...register(`batches.${index}.seats`)}
                      />
                    </Field>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field
                      label="Abre em (opcional)"
                      htmlFor={`batch-opens-${index}`}
                      hint="Vazio: já está valendo quando chegar a vez dele."
                    >
                      <Input
                        id={`batch-opens-${index}`}
                        type="datetime-local"
                        {...register(`batches.${index}.opensAt`)}
                      />
                    </Field>
                    <Field
                      label="Fecha em (opcional)"
                      htmlFor={`batch-closes-${index}`}
                      hint="Vazio: vale até esgotar."
                    >
                      <Input
                        id={`batch-closes-${index}`}
                        type="datetime-local"
                        {...register(`batches.${index}.closesAt`)}
                      />
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                appendBatch({
                  name: `${batchFields.length + 1}º lote`,
                  price: watch("price") ?? "",
                  seats: watch("seats") ?? "0",
                  opensAt: "",
                  closesAt: "",
                })
              }
            >
              <Plus className="h-4 w-4" aria-hidden />
              {usaLotes ? "Adicionar outro lote" : "Vender em lotes"}
            </Button>
            {!usaLotes && (
              <p className="mt-2 max-w-[52ch] text-muted text-xs">
                Em lotes, quem compra cedo paga menos: o primeiro esgota (ou vence a data) e o
                seguinte assume sozinho, mais caro.
              </p>
            )}
          </div>
        </section>

        {canPayout && (
          <section className="grid gap-5">
            <div>
              <h3 className="kicker">Repasse</h3>
              <p className="mt-2 text-muted text-sm">
                Se quem conduz o evento é outra pessoa — facilitadora, oficineiro — diga quanto de
                cada vaga é dela. O dinheiro da venda cai na conta da loja e o valor combinado fica
                registrado como repasse a pagar.
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
                <Field label="Quem recebe parte deste evento" htmlFor="supplierId">
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
                        <option value="fixed">Valor fixo por vaga</option>
                        <option value="percent">Porcentagem do valor</option>
                      </Select>
                    </Field>
                    <Field
                      label={payoutMode === "fixed" ? "Valor por vaga" : "Porcentagem"}
                      htmlFor="payoutValue"
                      hint={
                        payoutMode === "fixed"
                          ? "Quanto a pessoa recebe por vaga vendida"
                          : "Quanto do valor da vaga é da pessoa, de 0 a 100"
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
                      <dt className="text-muted">Valor da vaga</dt>
                      <dd className="font-medium">{money(breakdown.priceCents)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-muted">Repasse de quem conduz</dt>
                      <dd className="font-medium">{money(breakdown.payoutCents)}</dd>
                    </div>
                    {/* linha só existe quando a loja realmente paga comissão: com fee zero
                        (o normal hoje) ela era uma linha de R$ 0,00 pedindo explicação */}
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
                        Assim a loja paga para realizar. Diminua o repasse ou aumente o valor.
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
          <ImagePicker
            storeSlug={slug}
            images={images}
            onChange={setImages}
            onUploadingChange={setUploading}
            onError={setFormError}
          />
        </section>

        <FormError>{formError}</FormError>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isSubmitting || uploading}>
            {isSubmitting ? "Salvando…" : event ? "Salvar" : "Criar evento"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          {/* Arquivar fica longe do salvar e só existe na edição: é a ação que tira o
              evento da vista de quem compra. */}
          {event && (
            <Button
              type="button"
              variant="ghost"
              className="ml-auto text-danger"
              disabled={archiving}
              onClick={archive}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {archiving ? "Arquivando…" : "Arquivar"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function Attendees({ slug, eventSlug }: { slug: string; eventSlug: string }) {
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useListEventAttendees(slug, eventSlug);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(orderItemId: string, present: boolean) {
    setBusy(orderItemId);
    setError(null);
    try {
      await checkInAttendee(slug, eventSlug, orderItemId, { present });
      await queryClient.invalidateQueries({
        queryKey: listEventAttendeesQueryKey(slug, eventSlug),
      });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  if (isPending) return <SkeletonRows rows={2} className="mt-4" />;
  if (!data) return null;

  return (
    <div className="rule mt-4 pt-4">
      <p className="flex flex-wrap items-baseline gap-x-4 text-sm">
        <span className="font-medium">
          {data.checkedInQty} de {data.soldQty} chegaram
        </span>
        <span className="text-muted tabular-nums">
          {data.remaining} {data.remaining === 1 ? "vaga livre" : "vagas livres"}
        </span>
      </p>
      <FormError>{error}</FormError>

      {data.items.length === 0 ? (
        <p className="mt-3 text-muted text-sm">
          Ninguém garantiu vaga ainda. Mande o link do evento no grupo.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {data.items.map((person) => {
            const present = person.checkedInAt !== null;
            return (
              <li
                key={person.orderItemId}
                className="flex flex-wrap items-center gap-3 rounded-[0.9rem] border border-line px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-sm">
                    {person.name}
                    {person.qty > 1 && <Tag>{person.qty} vagas</Tag>}
                    {/* Vaga não paga é o caso que faz a loja passar vergonha na porta:
                        aparece marcado, não escondido. */}
                    {person.orderStatus === "pending_payment" && (
                      <Tag tone="accent">pagamento pendente</Tag>
                    )}
                  </p>
                  <p className="mt-0.5 text-muted text-xs tabular-nums">
                    {formatStoredPhone(person.phone)} · {money(person.paidCents)}
                  </p>
                </div>
                <a
                  href={whatsappUrl(person.phone)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Falar com ${person.name} no WhatsApp`}
                  className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-brand-deep"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                </a>
                <Button
                  size="sm"
                  variant={present ? "primary" : "secondary"}
                  disabled={busy === person.orderItemId}
                  onClick={() => toggle(person.orderItemId, !present)}
                >
                  {present ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden /> Chegou
                    </>
                  ) : (
                    "Marcar chegada"
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
