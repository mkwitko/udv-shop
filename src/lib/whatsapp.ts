/**
 * Link de conversa no WhatsApp. É o canal que essa gente já usa — a loja fala com quem
 * comprou por aqui, e quem comprou precisava de um caminho de volta que não existia.
 *
 * Aceita o telefone em qualquer formato ("(48) 99999-9999", "5548999999999") porque ele
 * vem tanto do banco (só dígitos, às vezes com DDI) quanto de campo digitado. Sem DDI,
 * assume Brasil: é onde a plataforma opera.
 */
export function whatsappUrl(rawPhone: string, message?: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  const full = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${full}${query}`;
}
