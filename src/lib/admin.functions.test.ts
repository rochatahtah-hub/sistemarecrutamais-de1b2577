import { describe, expect, it } from "vitest";

import { derivarRoleDoPerfil } from "./admin.functions";

describe("derivarRoleDoPerfil", () => {
  it("mantém o papel técnico quando o perfil já corresponde a um papel real", () => {
    expect(derivarRoleDoPerfil("admin")).toBe("admin");
    expect(derivarRoleDoPerfil("programadora")).toBe("programadora");
    expect(derivarRoleDoPerfil("supervisor")).toBe("supervisor");
    expect(derivarRoleDoPerfil("coordenador")).toBe("coordenador");
    expect(derivarRoleDoPerfil("comercial")).toBe("comercial");
    expect(derivarRoleDoPerfil("rs")).toBe("rs");
    expect(derivarRoleDoPerfil("coordenador_rs")).toBe("coordenador_rs");
  });

  it("cai em 'comercial' (sem privilégio automático de operar) para os perfis novos", () => {
    expect(derivarRoleDoPerfil("lider")).toBe("comercial");
    expect(derivarRoleDoPerfil("faturamento")).toBe("comercial");
    expect(derivarRoleDoPerfil("atendimento")).toBe("comercial");
    expect(derivarRoleDoPerfil("financeiro")).toBe("comercial");
  });

  it("cai em 'comercial' para qualquer chave desconhecida ou ausente", () => {
    expect(derivarRoleDoPerfil("qualquer-perfil-customizado")).toBe("comercial");
    expect(derivarRoleDoPerfil(null)).toBe("comercial");
    expect(derivarRoleDoPerfil(undefined)).toBe("comercial");
    expect(derivarRoleDoPerfil("")).toBe("comercial");
  });
});
