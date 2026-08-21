import { useRouter } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { ConfirmDialog } from "#/components/ui/confirm";
import { FormError, Input } from "#/components/ui/field";
import { SkeletonRows } from "#/components/ui/skeleton";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { createCategory } from "#/lib/api/gen/clients/createCategory";
import { deleteCategory } from "#/lib/api/gen/clients/deleteCategory";
import { reorderCategories } from "#/lib/api/gen/clients/reorderCategories";
import { updateCategory } from "#/lib/api/gen/clients/updateCategory";
import { listCategoriesQueryKey, useListCategories } from "#/lib/api/gen/hooks/useListCategories";
import type { ListCategories200 } from "#/lib/api/gen/types/ListCategories";

type Category = ListCategories200["items"][number];

/**
 * Gaveta é decisão de vitrine, então mora junto dos produtos. Sem drag: subir e descer
 * com botão funciona no celular, com teclado e com leitor de tela — arrastar não.
 */
export function CategoryManager({ slug }: { slug: string }) {
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useListCategories(slug);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState<Category | null>(null);
  const toast = useToast();
  const categories = data?.items ?? [];

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: listCategoriesQueryKey(slug) });
  }

  async function run(key: string, action: () => Promise<unknown>, done?: string) {
    setBusy(key);
    setError(null);
    try {
      await action();
      if (done) toast(done);
      await refresh();
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function create() {
    if (name.trim().length < 2) {
      setError("Escreva um nome com pelo menos duas letras.");
      return;
    }
    const ok = await run(
      "create",
      () => createCategory(slug, { name: name.trim() }),
      "Categoria criada.",
    );
    if (ok) setName("");
  }

  async function rename() {
    if (!editing) return;
    if (editing.name.trim().length < 2) {
      setError("Escreva um nome com pelo menos duas letras.");
      return;
    }
    const ok = await run(
      editing.id,
      () => updateCategory(slug, editing.id, { name: editing.name.trim() }),
      "Nome atualizado.",
    );
    if (ok) setEditing(null);
  }

  // a ordem inteira vai numa chamada: dois cliques rápidos não podem se atropelar
  async function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= categories.length) return;
    const ids = categories.map((category) => category.id);
    const moved = ids[index];
    const swapped = ids[next];
    if (!moved || !swapped) return;
    ids[index] = swapped;
    ids[next] = moved;
    await run(`move-${moved}`, () => reorderCategories(slug, { ids }));
  }

  async function remove() {
    if (!removing) return;
    const target = removing;
    setRemoving(null);
    await run(
      target.id,
      () => deleteCategory(slug, target.id),
      target.productCount > 0
        ? `${target.name} foi apagada. Os produtos continuam na loja.`
        : `${target.name} foi apagada.`,
    );
  }

  return (
    <section className="grid gap-4">
      <div>
        <h3 className="kicker">Categorias</h3>
        <p className="mt-2 max-w-[60ch] text-muted text-sm">
          As gavetas da sua vitrine. Quem chega na loja filtra por elas — a ordem daqui é a ordem
          que aparece lá.
        </p>
      </div>

      <FormError>{error}</FormError>

      {isPending ? (
        <SkeletonRows rows={2} />
      ) : categories.length === 0 ? (
        <p className="text-muted text-sm">
          Nenhuma categoria ainda. Sem elas a vitrine mostra tudo junto, o que funciona bem para
          poucos produtos.
        </p>
      ) : (
        <ul className="grid gap-2">
          {categories.map((category, index) => (
            <li key={category.id} className="card flex flex-wrap items-center gap-3 p-3">
              {editing?.id === category.id ? (
                <>
                  <Input
                    // foco automático: o campo substitui o nome que a pessoa acabou de clicar
                    autoFocus
                    className="h-10 min-w-[10rem] flex-1"
                    value={editing.name}
                    onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void rename();
                      if (event.key === "Escape") setEditing(null);
                    }}
                  />
                  <Button size="sm" disabled={busy === category.id} onClick={() => void rename()}>
                    <Check className="h-4 w-4" aria-hidden />
                    {busy === category.id ? "Salvando…" : "Salvar"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                    <X className="h-4 w-4" aria-hidden />
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{category.name}</p>
                    <p className="mt-0.5 text-muted text-sm tabular-nums">
                      {category.productCount === 0
                        ? "nenhum produto"
                        : category.productCount === 1
                          ? "1 produto"
                          : `${category.productCount} produtos`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton
                      label={`Subir ${category.name}`}
                      disabled={index === 0 || busy !== null}
                      onClick={() => void move(index, -1)}
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden />
                    </IconButton>
                    <IconButton
                      label={`Descer ${category.name}`}
                      disabled={index === categories.length - 1 || busy !== null}
                      onClick={() => void move(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden />
                    </IconButton>
                    <IconButton
                      label={`Renomear ${category.name}`}
                      disabled={busy !== null}
                      onClick={() => setEditing({ id: category.id, name: category.name })}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </IconButton>
                    <IconButton
                      label={`Apagar ${category.name}`}
                      disabled={busy !== null}
                      onClick={() => setRemoving(category)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </IconButton>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label className="font-medium text-ink text-sm" htmlFor="nova-categoria">
            Nova categoria
          </label>
          <Input
            id="nova-categoria"
            className="mt-1.5"
            placeholder="Chás, Artesanato, Livros…"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void create();
              }
            }}
          />
        </div>
        <Button size="md" disabled={busy === "create"} onClick={() => void create()}>
          <Plus className="h-4 w-4" aria-hidden />
          {busy === "create" ? "Criando…" : "Criar categoria"}
        </Button>
      </div>

      <ConfirmDialog
        open={removing !== null}
        title={`Apagar “${removing?.name ?? ""}”?`}
        confirmLabel="Apagar categoria"
        busy={busy === removing?.id}
        onCancel={() => setRemoving(null)}
        onConfirm={() => void remove()}
      >
        {removing && removing.productCount > 0
          ? `Esta categoria tem ${
              removing.productCount === 1 ? "1 produto" : `${removing.productCount} produtos`
            }. Os produtos continuam na loja e à venda — só ficam sem categoria, e você pode colocá-los em outra depois.`
          : "Nenhum produto usa esta categoria. Ela sai da vitrine na hora."}
      </ConfirmDialog>
    </section>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-full border border-line bg-elevated text-muted transition-colors [transition-duration:var(--dur)] hover:border-line-strong hover:text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}
