import { describe, expect, it } from "vitest";
import { interpretarFicha } from "./ficha-texto";

const FICHA = `🚨 CADASTRO PARA VAGA – AGIZZE RH

Nome completo: RONILDO CARVALHO BRITO
CPF: 086.723.953-01
Idade: 27 anos
Telefone: 47 99769-5445

Endereço COMPLETO com número da casa ou Ap: 01
Bairro: Planalto
Cidade: Brusque-SC

Chave PIX (obrigatório ser em seu nome): CPF 086.723.953-01

Tamanho do uniforme: G

Possui condução? (×) Sim ( ) Não
Se sim, qual? Carro

Ponto de embarque, se for usar transporte: Panificadora Sodepan

Recrutado por: TALITA`;

describe("interpretarFicha", () => {
  it("lê a ficha completa sem confundir CPF com Pix", () => {
    const d = interpretarFicha(FICHA);
    expect(d.nome).toBe("Ronildo Carvalho Brito");
    expect(d.cpf).toBe("08672395301");
    expect(d.telefone).toBe("47997695445");
    expect(d.pix).toBe("CPF 086.723.953-01");
    expect(d.transporte_proprio).toBe(true);
    expect(d.transporte_tipos).toEqual(["carro"]);
    expect(d.transporte_observacao).toContain("Panificadora Sodepan");
  });

  it("aceita Pix por e-mail", () => {
    expect(interpretarFicha("CPF: 086.723.953-01\nChave PIX: ronildo@email.com").pix).toBe(
      "ronildo@email.com",
    );
  });

  it("aceita Pix por telefone", () => {
    expect(interpretarFicha("Chave PIX: 47 99999-9999").pix).toBe("47 99999-9999");
  });

  it("aceita chave aleatória", () => {
    const chave = "b1d2c3e4-5f6a-7b8c-9d0e-1f2a3b4c5d6e";
    expect(interpretarFicha(`PIX: ${chave}`).pix).toBe(chave);
  });

  it("aceita rótulo sozinho com valor na linha seguinte", () => {
    expect(interpretarFicha("Chave PIX:\nCPF 086.723.953-01").pix).toBe("CPF 086.723.953-01");
  });
});

describe("formatação do nome ao colar ficha", () => {
  const casos: [string, string][] = [
    ["TALITA GONÇALVES DA ROCHA", "Talita Gonçalves da Rocha"],
    ["TALITA ROCHA", "Talita Rocha"],
    ["JOAO DA SILVA", "Joao da Silva"],
    ["MARIA EDUARDA DOS SANTOS", "Maria Eduarda dos Santos"],
    ["ANA CAROLINA DE OLIVEIRA", "Ana Carolina de Oliveira"],
    ["PEDRO HENRIQUE DA SILVA", "Pedro Henrique da Silva"],
    ["MARIA DAS DORES SILVA", "Maria das Dores Silva"],
    ["JOÃO PEDRO DE OLIVEIRA", "João Pedro de Oliveira"],
    ["MARIA DE FATIMA DA SILVA", "Maria de Fatima da Silva"],
    ["JOAO PEDRO HENRIQUE DOS SANTOS OLIVEIRA", "Joao Pedro Henrique dos Santos Oliveira"],
    ["TALITA   GONÇALVES   DA   ROCHA", "Talita Gonçalves da Rocha"],
  ];
  for (const [entrada, esperado] of casos) {
    it(`formata "${entrada}" como "${esperado}"`, () => {
      expect(interpretarFicha(`Nome completo: ${entrada}\nCPF: 086.723.953-01`).nome).toBe(
        esperado,
      );
    });
  }

  it("não afeta a leitura de CPF, telefone e Pix", () => {
    const d = interpretarFicha(FICHA);
    expect(d.cpf).toBe("08672395301");
    expect(d.telefone).toBe("47997695445");
    expect(d.pix).toBe("CPF 086.723.953-01");
  });
});

describe("rótulo 'Chave Pix (obrigatório ser no seu nome)'", () => {
  const casos = [
    "086.723.953-01",
    "exemplo@email.com",
    "123e4567-e89b-12d3-a456-426614174000",
  ];
  for (const valor of casos) {
    it(`captura ${valor} na mesma linha`, () => {
      expect(
        interpretarFicha(`Chave Pix (obrigatório ser no seu nome): ${valor}`).pix,
      ).toBe(valor);
    });
    it(`captura ${valor} na linha seguinte`, () => {
      expect(
        interpretarFicha(`CHAVE PIX (obrigatório ser no seu nome)\n${valor}`).pix,
      ).toBe(valor);
    });
  }
});
