import { describe, expect, it } from "vitest";
import { inviteState, roleLabel } from "./invite";

describe("inviteState", () => {
  const invite = { email: "ana@example.org" };

  it("sessão carregando → loading", () => {
    expect(inviteState("loading", null, invite)).toBe("loading");
  });

  it("deslogado → precisa entrar", () => {
    expect(inviteState("anonymous", null, invite)).toBe("anonymous");
  });

  it("logado com o e-mail do convite (qualquer caixa) → pronto para aceitar", () => {
    expect(inviteState("authenticated", "Ana@Example.org", invite)).toBe("ready");
  });

  it("logado com outro e-mail, ou conta sem e-mail → mismatch", () => {
    expect(inviteState("authenticated", "bob@example.org", invite)).toBe("mismatch");
    expect(inviteState("authenticated", null, invite)).toBe("mismatch");
  });
});

describe("roleLabel", () => {
  it("traduz papel para gente", () => {
    expect(roleLabel("owner")).toBe("Dono");
    expect(roleLabel("admin")).toBe("Administrador");
    expect(roleLabel("staff")).toBe("Equipe");
  });
});
