import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface FichaExtraida {
  nome: string;
  cpf: string;
  telefone: string;
}

/**
 * Le a ficha do candidato (imagem ou texto) e devolve SOMENTE nome, CPF e telefone.
 * Nenhum outro dado da ficha e armazenado ou retornado.
 */
export const extrairFicha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { arquivoBase64?: string; mimeType?: string; texto?: string }) => {
    if (!input.arquivoBase64 && !input.texto) throw new Error("Envie a ficha do candidato.");
    if (input.arquivoBase64 && input.arquivoBase64.length > 8_000_000)
      throw new Error("Arquivo muito grande. Envie uma imagem de até 5 MB.");
    return input;
  })
  .handler(async ({ data }): Promise<FichaExtraida> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Leitura automática indisponível no momento.");

    const instrucao =
      "Você lê fichas de cadastro de candidatos. Extraia APENAS o nome completo, o CPF e o telefone. " +
      "Ignore e descarte qualquer outra informação. Responda somente com JSON: " +
      '{"nome":"","cpf":"","telefone":""}. CPF e telefone apenas com dígitos. Se não encontrar, use "".';

    const conteudo: Array<Record<string, unknown>> = [
      { type: "text", text: "Extraia nome, CPF e telefone desta ficha." },
    ];
    if (data.arquivoBase64) {
      conteudo.push({
        type: "image_url",
        image_url: { url: `data:${data.mimeType ?? "image/jpeg"};base64,${data.arquivoBase64}` },
      });
    }
    if (data.texto) conteudo.push({ type: "text", text: data.texto.slice(0, 20000) });

    const resposta = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: instrucao },
          { role: "user", content: conteudo },
        ],
      }),
    });

    if (resposta.status === 429) throw new Error("Muitas leituras seguidas. Tente novamente em instantes.");
    if (resposta.status === 402) throw new Error("Créditos de IA esgotados no espaço de trabalho.");
    if (!resposta.ok) {
      const corpo = await resposta.text();
      console.error(`[ficha] falha ${resposta.status}: ${corpo}`);
      throw new Error("Não consegui ler a ficha. Preencha manualmente.");
    }

    const json = (await resposta.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const bruto = json.choices?.[0]?.message?.content ?? "";
    const match = bruto.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Não consegui identificar os dados da ficha.");
    const dados = JSON.parse(match[0]) as Partial<FichaExtraida>;
    const digitos = (v?: string) => (v ?? "").replace(/\D/g, "");
    return {
      nome: (dados.nome ?? "").trim(),
      cpf: digitos(dados.cpf),
      telefone: digitos(dados.telefone),
    };
  });
