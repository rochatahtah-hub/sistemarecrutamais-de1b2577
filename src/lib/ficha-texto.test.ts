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
    expect(d.nome).toBe("RONILDO CARVALHO BRITO");
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
    ["TALITA GONÇALVES DA ROCHA", "TALITA GONÇALVES DA ROCHA"],
    ["TALITA ROCHA", "TALITA ROCHA"],
    ["JOAO DA SILVA", "JOAO DA SILVA"],
    ["MARIA EDUARDA DOS SANTOS", "MARIA EDUARDA DOS SANTOS"],
    ["ANA CAROLINA DE OLIVEIRA", "ANA CAROLINA DE OLIVEIRA"],
    ["PEDRO HENRIQUE DA SILVA", "PEDRO HENRIQUE DA SILVA"],
    ["MARIA DAS DORES SILVA", "MARIA DAS DORES SILVA"],
    ["JOÃO PEDRO DE OLIVEIRA", "JOÃO PEDRO DE OLIVEIRA"],
    ["MARIA DE FATIMA DA SILVA", "MARIA DE FATIMA DA SILVA"],
    ["JOAO PEDRO HENRIQUE DOS SANTOS OLIVEIRA", "JOAO PEDRO HENRIQUE DOS SANTOS OLIVEIRA"],
    ["TALITA   GONÇALVES   DA   ROCHA", "TALITA GONÇALVES DA ROCHA"],
    ["Talita Gonçalves da Rocha", "TALITA GONÇALVES DA ROCHA"],
    ["joão da silva", "JOÃO DA SILVA"],
    ["  Maria   Eduarda  ", "MARIA EDUARDA"],
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
