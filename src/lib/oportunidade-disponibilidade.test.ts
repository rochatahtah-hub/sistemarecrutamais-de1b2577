import { describe, expect, it } from "vitest";
import { motivoIndisponibilidade } from "./oportunidade-disponibilidade";

const config = { diarias_ativa: true, oportunidades_ativa: true, clt_ativa: true };
const diaria = { modalidade: "especifica", tipo_diaria: "selecionada", status: "ativa", data_oportunidade: "2026-10-15" };
describe("publicação e disponibilidade de links", () => {
  it("permite diária selecionada publicada", () => expect(motivoIndisponibilidade(diaria, config, "2026-10-15")).toBeNull());
  it("avulsa usa a publicação de diárias", () => expect(motivoIndisponibilidade({ ...diaria, tipo_diaria: "avulsa" }, { ...config, diarias_ativa: false }, "2026-10-15")).not.toBeNull());
  it("CLT usa a publicação CLT", () => expect(motivoIndisponibilidade({ ...diaria, modalidade: "clt" }, { ...config, clt_ativa: false }, "2026-10-15")).not.toBeNull());
  it("despublicação bloqueia cadastro", () => expect(motivoIndisponibilidade({ ...diaria, status: "arquivada" }, config, "2026-10-15")).not.toBeNull());
  it("data passada encerra diária", () => expect(motivoIndisponibilidade(diaria, config, "2026-10-16")).not.toBeNull());
  it("vaga fechada bloqueia cadastro", () => expect(motivoIndisponibilidade({ ...diaria, vaga_id: "vaga", vaga: { situacao: "FECHADA", status: "PRESENCA" } }, config, "2026-10-15")).not.toBeNull());
  it("vaga cancelada bloqueia cadastro", () => expect(motivoIndisponibilidade({ ...diaria, vaga_id: "vaga", vaga: { situacao: "ABERTA", status: "CANCELAMENTO" } }, config, "2026-10-15")).not.toBeNull());
  it("selecionada desativada não recebe inscrições", () => expect(motivoIndisponibilidade(diaria, { ...config, oportunidades_ativa: false }, "2026-10-15")).not.toBeNull());
});