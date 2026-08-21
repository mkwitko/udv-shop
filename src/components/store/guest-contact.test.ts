import { describe, expect, it } from "vitest";
import { EMPTY_CONTACT, toContactPayload, validateGuestContact } from "./guest-contact-fields";

describe("validateGuestContact", () => {
  it("exige nome", () => {
    expect(validateGuestContact({ ...EMPTY_CONTACT, phone: "(11) 98888-7777" })).toMatch(/nome/i);
  });

  it("exige telefone com DDD", () => {
    expect(validateGuestContact({ ...EMPTY_CONTACT, name: "Maria Silva", phone: "98888" })).toMatch(
      /telefone/i,
    );
  });

  it("recusa e-mail malformado quando preenchido", () => {
    expect(
      validateGuestContact({ name: "Maria Silva", phone: "(11) 98888-7777", email: "maria@" }),
    ).toMatch(/e-mail/i);
  });

  it("aceita nome e telefone sem e-mail", () => {
    expect(
      validateGuestContact({ name: "Maria Silva", phone: "(11) 98888-7777", email: "" }),
    ).toBeNull();
  });

  it("aceita telefone fixo de 10 dígitos", () => {
    expect(
      validateGuestContact({ name: "Maria Silva", phone: "(11) 3333-4444", email: "" }),
    ).toBeNull();
  });
});

describe("toContactPayload", () => {
  it("omite o e-mail quando a pessoa não deu um", () => {
    const payload = toContactPayload({ name: "Maria Silva", phone: "(11) 98888-7777", email: "" });
    expect(payload).toEqual({ name: "Maria Silva", phone: "(11) 98888-7777" });
    expect("email" in payload).toBe(false);
  });

  it("apara espaços de nome e e-mail", () => {
    expect(
      toContactPayload({
        name: "  Maria Silva ",
        phone: "(11) 98888-7777",
        email: " maria@example.org ",
      }),
    ).toEqual({
      name: "Maria Silva",
      phone: "(11) 98888-7777",
      email: "maria@example.org",
    });
  });
});
