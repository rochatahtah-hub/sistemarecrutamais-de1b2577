import { describe, expect, it } from "vitest";
import { escaparHtml } from "./html-seguro";

/** Um e-mail montado como o de solicitação de feedback. */
function emailComNomeDaEmpresa(nome: string) {
  return `<p>Olá, equipe <strong>${escaparHtml(nome)}</strong>.</p>`;
}

describe("escaparHtml", () => {
  it("neutraliza script", () => {
    const html = emailComNomeDaEmpresa("<script>alert('teste')</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("neutraliza evento onerror em img", () => {
    const html = emailComNomeDaEmpresa('<img src="x" onerror="alert(\'teste\')">');
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/onerror\s*=\s*"/);
  });

  it("neutraliza link com esquema javascript:", () => {
    const html = emailComNomeDaEmpresa("<a href=\"javascript:alert('teste')\">Clique aqui</a>");
    expect(html).not.toContain("<a href");
    expect(html).toContain("&lt;a href=&quot;javascript:");
  });

  it("não deixa escapar aspas que quebrariam um atributo", () => {
    expect(escaparHtml('" onmouseover="alert(1)')).not.toMatch(/[^&]"/);
  });

  it("escapa o & antes do resto, sem dupla codificação errada", () => {
    expect(escaparHtml("A & B")).toBe("A &amp; B");
    expect(escaparHtml("<")).toBe("&lt;");
  });

  it("preserva texto legítimo com acento", () => {
    expect(escaparHtml("Construções Pátio Ltda")).toBe("Construções Pátio Ltda");
  });
});
