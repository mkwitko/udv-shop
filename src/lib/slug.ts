/**
 * Sugestão de endereço a partir do nome. Só sugere: a validação que vale é a do schema,
 * igual à da API. Acentos viram a letra base — "Núcleo Estrela" → "nucleo-estrela".
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}
