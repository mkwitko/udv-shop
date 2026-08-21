import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Check, Copy, Globe, Image as ImageIcon, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { ConfirmDialog } from "#/components/ui/confirm";
import { Field, FormError, Input } from "#/components/ui/field";
import { ImagePicker, type PickedImage } from "#/components/ui/image-picker";
import { SkeletonRows } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { deleteStoreDomain } from "#/lib/api/gen/clients/deleteStoreDomain";
import { putStoreDomain } from "#/lib/api/gen/clients/putStoreDomain";
import { updateStore } from "#/lib/api/gen/clients/updateStore";
import { verifyStoreDomain } from "#/lib/api/gen/clients/verifyStoreDomain";
import { getStoreQueryKey, useGetStore } from "#/lib/api/gen/hooks/useGetStore";
import { getStoreDomainQueryKey, useGetStoreDomain } from "#/lib/api/gen/hooks/useGetStoreDomain";
import { longDate } from "#/lib/format";

export const Route = createFileRoute("/gestao/$slug/configuracoes")({
  component: SettingsAdmin,
});

function SettingsAdmin() {
  const { slug } = Route.useParams();
  return (
    <div className="grid gap-8">
      <div>
        <h2 className="font-display font-semibold text-lg tracking-tight">Configurações</h2>
        <p className="mt-1 text-muted text-sm">
          A cara da loja e o endereço dela na internet. Para preço, produto e recebimento, use as
          outras abas.
        </p>
      </div>
      <BrandingBlock slug={slug} />
      <DomainBlock slug={slug} />
    </div>
  );
}

/**
 * Logo e capa. Sem elas a vitrine continua no bloco tangerina de sempre — a loja que não
 * subir nada não fica pior do que está hoje; a que subir ganha a cara da comunidade.
 */
function BrandingBlock({ slug }: { slug: string }) {
  const { queryClient } = useRouter().options.context;
  const { data: store, isPending } = useGetStore(slug);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "logo" | "cover">(null);
  const toast = useToast();

  const logo: PickedImage[] = store?.branding?.logoKey
    ? [{ key: store.branding.logoKey, url: store.branding.logoUrl ?? "" }]
    : [];
  const cover: PickedImage[] = store?.branding?.coverKey
    ? [{ key: store.branding.coverKey, url: store.branding.coverUrl ?? "" }]
    : [];

  // PATCH de um campo só: mandar a capa não pode apagar a logo que já estava lá
  async function save(field: "logoKey" | "coverKey", images: PickedImage[]) {
    const which = field === "logoKey" ? "logo" : "cover";
    setBusy(which);
    setError(null);
    try {
      await updateStore(slug, { branding: { [field]: images[0]?.key ?? null } });
      await queryClient.invalidateQueries({ queryKey: getStoreQueryKey(slug) });
      toast(images.length > 0 ? "Imagem salva." : "Imagem removida.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  if (isPending) return <SkeletonRows rows={2} />;

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-brand-soft text-brand-deep"
          aria-hidden
        >
          <ImageIcon className="h-5 w-5" />
        </span>
        <div className="min-w-[12rem] flex-1">
          <h3 className="font-display font-semibold tracking-tight">A cara da loja</h3>
          <p className="mt-0.5 text-muted text-sm">
            Uma logo e uma foto de capa. Sem elas, a loja abre no bloco laranja de sempre.
          </p>
        </div>
      </div>

      <FormError>{error}</FormError>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div className="grid gap-2">
          <h4 className="kicker">Logo</h4>
          <p className="text-muted text-sm">
            Aparece redonda no topo da loja. Imagem quadrada funciona melhor.
          </p>
          <ImagePicker
            storeSlug={slug}
            images={logo}
            max={1}
            multiple={false}
            label="Escolher a logo"
            onError={setError}
            onChange={(images) => void save("logoKey", images)}
          />
          {busy === "logo" && <p className="text-muted text-sm">Salvando…</p>}
        </div>

        <div className="grid gap-2">
          <h4 className="kicker">Capa</h4>
          <p className="text-muted text-sm">
            Faixa larga atrás do nome. Escolha uma foto do núcleo, de preferência sem texto.
          </p>
          <ImagePicker
            storeSlug={slug}
            images={cover}
            max={1}
            multiple={false}
            label="Escolher a capa"
            onError={setError}
            onChange={(images) => void save("coverKey", images)}
          />
          {busy === "cover" && <p className="text-muted text-sm">Salvando…</p>}
        </div>
      </div>
    </section>
  );
}

/**
 * Domínio próprio: um endereço só da comunidade em vez do link da plataforma. Depende
 * de um CNAME no DNS de quem registrou o domínio, então a tela mostra exatamente o que
 * pedir e verifica quando a pessoa disser que já configurou.
 */
function DomainBlock({ slug }: { slug: string }) {
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useGetStoreDomain(slug);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "save" | "verify" | "remove">(null);
  const [found, setFound] = useState<string[] | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const toast = useToast();

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: getStoreDomainQueryKey(slug) });
  }

  async function save() {
    if (!value.trim()) {
      setError("Digite o endereço, como loja.suacomunidade.org.");
      return;
    }
    setBusy("save");
    setError(null);
    setFound(null);
    try {
      await putStoreDomain(slug, { domain: value.trim() });
      toast("Endereço salvo. Agora falta o CNAME no DNS.");
      setValue("");
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  async function verify() {
    setBusy("verify");
    setError(null);
    try {
      const result = await verifyStoreDomain(slug);
      setFound(result.found);
      toast(
        result.verified
          ? "Tudo certo: o endereço já leva para a sua loja."
          : "Ainda não achamos o CNAME. O DNS às vezes leva algumas horas.",
      );
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setConfirmRemove(false);
    setBusy("remove");
    setError(null);
    try {
      await deleteStoreDomain(slug);
      toast("Endereço removido. A loja continua no link da plataforma.");
      setFound(null);
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  if (isPending) return <SkeletonRows rows={2} />;

  if (data && !data.enabled) {
    return (
      <section className="card p-5">
        <h3 className="font-display font-semibold tracking-tight">Endereço próprio</h3>
        <p className="mt-2 max-w-[52ch] text-muted text-sm">
          Ainda não liberamos endereço próprio nesta plataforma. Sua loja continua funcionando pelo
          link de sempre.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-brand-soft text-brand-deep"
          aria-hidden
        >
          <Globe className="h-5 w-5" />
        </span>
        <div className="min-w-[12rem] flex-1">
          <h3 className="font-display font-semibold tracking-tight">Endereço próprio</h3>
          <p className="mt-0.5 text-muted text-sm">
            Um endereço da comunidade, como loja.suacomunidade.org.
          </p>
        </div>
        {data?.domain &&
          (data.verified ? (
            <Tag tone="success">no ar</Tag>
          ) : (
            <Tag tone="accent">esperando o DNS</Tag>
          ))}
      </div>

      <FormError>{error}</FormError>

      {data?.domain ? (
        <div className="mt-5 grid gap-4">
          <p className="font-medium tabular-nums">{data.domain}</p>

          {data.verified ? (
            <p className="text-muted text-sm">
              Verificado em {longDate(data.verifiedAt ?? "")}. Quem digitar esse endereço cai direto
              na sua loja.
            </p>
          ) : (
            <div className="grid gap-3 rounded-[1rem] border border-line bg-surface p-4">
              <p className="text-sm">
                Falta um passo, no site onde você registrou o domínio: crie um registro{" "}
                <strong>CNAME</strong> apontando para o endereço abaixo.
              </p>
              <dl className="grid gap-1 text-sm tabular-nums">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted">Tipo</dt>
                  <dd className="font-medium">CNAME</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted">Nome</dt>
                  <dd className="font-medium">{data.domain}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted">Aponta para</dt>
                  <dd className="font-medium">{data.target}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="flex items-center gap-2 justify-self-start text-brand-deep text-sm underline underline-offset-4"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(data.target)
                    .then(() => toast("Endereço copiado."));
                }}
              >
                <Copy className="h-4 w-4" aria-hidden />
                Copiar {data.target}
              </button>
              {found !== null && (
                <p className="text-muted text-sm">
                  {found.length === 0
                    ? "Ainda não existe CNAME nesse endereço."
                    : `Hoje o CNAME aponta para: ${found.join(", ")}.`}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled={busy !== null} onClick={verify}>
              {data.verified ? (
                <RefreshCw className="h-4 w-4" aria-hidden />
              ) : (
                <Check className="h-4 w-4" aria-hidden />
              )}
              {busy === "verify"
                ? "Verificando…"
                : data.verified
                  ? "Verificar de novo"
                  : "Já configurei, verificar"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy !== null}
              onClick={() => setConfirmRemove(true)}
            >
              Remover endereço
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid max-w-md gap-4">
          <Field
            label="Endereço da loja"
            htmlFor="domain"
            hint="Você precisa já ter registrado esse domínio."
          >
            <Input
              id="domain"
              inputMode="url"
              placeholder="loja.suacomunidade.org"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </Field>
          <Button size="sm" className="justify-self-start" disabled={busy !== null} onClick={save}>
            {busy === "save" ? "Salvando…" : "Usar este endereço"}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmRemove}
        title="Remover o endereço próprio?"
        confirmLabel="Remover endereço"
        busy={busy === "remove"}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={remove}
      >
        Quem digitar esse endereço deixa de chegar na loja. Nada é apagado: produtos, pedidos e
        campanhas continuam no link da plataforma, e você pode configurar de novo depois.
      </ConfirmDialog>
    </section>
  );
}
