import { beforeEach, describe, expect, it, vi } from "vitest";
import { chainResolvendo } from "@/test/supabaseMock";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mockFrom } }));

import {
  abrirDivergencia,
  buscarConferencias,
  calcularTotalEstimado,
  derivarStatusValidacao,
  ehDomingo,
  ehSabado,
  resolverDivergencia,
  salvarConferencia,
  validarConferencia,
} from "./atendimento";

beforeEach(() => {
  mockFrom.mockReset();
});

describe("calcularTotalEstimado", () => {
  it("soma valor da diária, adicional percentual e ajuda de custo", () => {
    expect(
      calcularTotalEstimado({ valorDiaria: 100, adicionalPercentual: 50, ajudaCustoValor: 20 }),
    ).toBe(170);
  });

  it("não aplica nenhum adicional quando o percentual é 0", () => {
    expect(
      calcularTotalEstimado({ valorDiaria: 100, adicionalPercentual: 0, ajudaCustoValor: 0 }),
    ).toBe(100);
  });

  it("trata valores ausentes como zero", () => {
    expect(calcularTotalEstimado({})).toBe(0);
  });

  it("arredonda para duas casas decimais", () => {
    expect(
      calcularTotalEstimado({ valorDiaria: 33.33, adicionalPercentual: 10, ajudaCustoValor: 0 }),
    ).toBe(36.66);
  });
});

describe("ehSabado / ehDomingo", () => {
  it("identifica sábado corretamente", () => {
    expect(ehSabado("2026-08-22")).toBe(true);
    expect(ehSabado("2026-08-23")).toBe(false);
  });

  it("identifica domingo corretamente", () => {
    expect(ehDomingo("2026-08-23")).toBe(true);
    expect(ehDomingo("2026-08-24")).toBe(false);
  });
});

describe("derivarStatusValidacao", () => {
  it("usa histórico não avaliado quando não existe linha de conferência", () => {
    expect(derivarStatusValidacao("PRESENCA", null)).toBe("HISTORICO_NAO_AVALIADO");
  });

  it("usa o status gravado quando existe conferência", () => {
    expect(derivarStatusValidacao("PRESENCA", { status_validacao: "VALIDADO" })).toBe("VALIDADO");
    expect(derivarStatusValidacao("PRESENCA", { status_validacao: "DIVERGENCIA" })).toBe(
      "DIVERGENCIA",
    );
  });
});

describe("buscarConferencias", () => {
  it("marca como histórico não avaliado quando a vaga não tem conferência ainda", async () => {
    mockFrom.mockReturnValueOnce(
      chainResolvendo({
        data: [
          {
            id: "vaga-1",
            data: "2026-08-20",
            status: "PRESENCA",
            descricao: null,
            cargo: "Auxiliar",
            horario: "08:00 às 17:00",
            empresa_id: "empresa-1",
            programadora_id: null,
            empresas: { nome: "ACME" },
            candidatos: {
              id: "cand-1",
              nome: "Fulano",
              cpf: "08672395301",
              telefone: "47999999999",
            },
            atendimento_conferencias: null,
          },
        ],
        error: null,
      }),
    );
    const r = await buscarConferencias();
    expect(r).toHaveLength(1);
    expect(r[0]?.conferencia.status_validacao).toBe("HISTORICO_NAO_AVALIADO");
    expect(r[0]?.nome).toBe("Fulano");
  });

  it("lida com atendimento_conferencias vindo como array (join do Supabase)", async () => {
    mockFrom.mockReturnValueOnce(
      chainResolvendo({
        data: [
          {
            id: "vaga-2",
            data: "2026-08-21",
            status: "FALTA",
            descricao: null,
            cargo: "",
            horario: "",
            empresa_id: null,
            programadora_id: null,
            empresas: null,
            candidatos: null,
            atendimento_conferencias: [
              {
                id: "conf-1",
                status_validacao: "PENDENTE",
                validado_por_nome: "",
                validado_em: null,
                horario_realizado_entrada: "",
                horario_realizado_saida: "",
                jornada_completa: null,
                horas_trabalhadas: null,
                motivo_jornada_parcial: "",
                valor_diaria: 120,
                tem_ajuda_custo: false,
                ajuda_custo_valor: 0,
                tipo_adicional: "NENHUM",
                adicional_percentual: 0,
                adicional_motivo: "",
                total_estimado: 120,
                checklist: {},
                observacao: "",
              },
            ],
          },
        ],
        error: null,
      }),
    );
    const r = await buscarConferencias();
    expect(r[0]?.conferencia.status_validacao).toBe("PENDENTE");
    expect(r[0]?.conferencia.valor_diaria).toBe(120);
  });

  it("propaga erro do banco", async () => {
    mockFrom.mockReturnValueOnce(chainResolvendo({ data: null, error: new Error("falha") }));
    await expect(buscarConferencias()).rejects.toThrow("falha");
  });
});

describe("salvarConferencia", () => {
  it("grava o total estimado calculado e zera a ajuda de custo quando desmarcada", async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValueOnce({ upsert });

    await salvarConferencia({
      vagaId: "vaga-1",
      valorDiaria: 100,
      adicionalPercentual: 50,
      temAjudaCusto: false,
      ajudaCustoValor: 999,
    });

    expect(mockFrom).toHaveBeenCalledWith("atendimento_conferencias");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ vaga_id: "vaga-1", ajuda_custo_valor: 0, total_estimado: 150 }),
      { onConflict: "vaga_id" },
    );
  });

  it("propaga erro do banco", async () => {
    mockFrom.mockReturnValueOnce(chainResolvendo({ data: null, error: { message: "falhou" } }));
    await expect(salvarConferencia({ vagaId: "vaga-1" })).rejects.toThrow("falhou");
  });
});

describe("validarConferencia", () => {
  it("faz upsert do status VALIDADO por vaga_id", async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValueOnce({ upsert });

    await validarConferencia("vaga-1");

    expect(upsert).toHaveBeenCalledWith(
      { vaga_id: "vaga-1", status_validacao: "VALIDADO" },
      { onConflict: "vaga_id" },
    );
  });

  it("propaga erro do banco (ex.: divergência aberta bloqueando no trigger)", async () => {
    mockFrom.mockReturnValueOnce(
      chainResolvendo({ data: null, error: { message: "existe divergência aberta" } }),
    );
    await expect(validarConferencia("vaga-1")).rejects.toThrow("existe divergência aberta");
  });
});

describe("abrirDivergencia", () => {
  it("recusa sem motivo e não toca no banco", async () => {
    await expect(
      abrirDivergencia({ vagaId: "vaga-1", conferenciaId: "conf-1", tipo: "" }),
    ).rejects.toThrow("Selecione o motivo da divergência.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("recusa sem conferência salva e não toca no banco", async () => {
    await expect(
      abrirDivergencia({ vagaId: "vaga-1", conferenciaId: null, tipo: "Valor incorreto" }),
    ).rejects.toThrow("Salve a conferência");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("insere a divergência quando os dados são válidos", async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValueOnce({ insert });

    await abrirDivergencia({ vagaId: "vaga-1", conferenciaId: "conf-1", tipo: "Valor incorreto" });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        conferencia_id: "conf-1",
        vaga_id: "vaga-1",
        tipo: "Valor incorreto",
      }),
    );
  });
});

describe("resolverDivergencia", () => {
  it("recusa sem descrever o resultado e não toca no banco", async () => {
    await expect(resolverDivergencia({ divergenciaId: "div-1", resultado: "  " })).rejects.toThrow(
      "Descreva como a divergência foi resolvida.",
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("marca como resolvida quando há resultado", async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockFrom.mockReturnValueOnce({ update });

    await resolverDivergencia({ divergenciaId: "div-1", resultado: "Corrigido o valor." });

    expect(update).toHaveBeenCalledWith({ status: "RESOLVIDA", resultado: "Corrigido o valor." });
  });
});
