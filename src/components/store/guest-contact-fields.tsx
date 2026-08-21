import { Field, Input } from "#/components/ui/field";
import { formatPhone } from "#/lib/format";

/**
 * Contato de quem participa sem conta. `email` vazio significa "não informou" — é opcional de
 * propósito: pedir aviso de um produto ou apoiar uma campanha não pode custar um cadastro.
 */
export type GuestContact = { name: string; phone: string; email: string };

export const EMPTY_CONTACT: GuestContact = { name: "", phone: "", email: "" };

/** Mensagem do primeiro problema encontrado, ou `null` se está tudo certo. */
export function validateGuestContact(contact: GuestContact): string | null {
  if (contact.name.trim().length < 2) return "Coloque seu nome.";
  if (contact.phone.replace(/\D/g, "").length < 10) return "Coloque um telefone com DDD.";
  if (contact.email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
    return "Confira o e-mail.";
  }
  return null;
}

/** O `contact` que vai no corpo da requisição — sem a chave `email` quando não há e-mail. */
export function toContactPayload(contact: GuestContact) {
  const email = contact.email.trim();
  return {
    name: contact.name.trim(),
    phone: contact.phone,
    ...(email === "" ? {} : { email }),
  };
}

export function GuestContactFields({
  value,
  onChange,
  emailHint,
}: {
  value: GuestContact;
  onChange: (next: GuestContact) => void;
  emailHint?: string;
}) {
  return (
    <div className="grid gap-4">
      <Field label="Seu nome" htmlFor="guest-name">
        <Input
          id="guest-name"
          autoComplete="name"
          placeholder="Como a loja te chama"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </Field>
      <Field
        label="Telefone com DDD"
        htmlFor="guest-phone"
        hint="É por aqui que a loja fala com você."
      >
        <Input
          id="guest-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 98765-4321"
          value={value.phone}
          onChange={(event) => onChange({ ...value, phone: formatPhone(event.target.value) })}
        />
      </Field>
      <Field
        label="E-mail (opcional)"
        htmlFor="guest-email"
        hint={emailHint ?? "Deixe se quiser receber aviso por e-mail também."}
      >
        <Input
          id="guest-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={value.email}
          onChange={(event) => onChange({ ...value, email: event.target.value })}
        />
      </Field>
    </div>
  );
}
