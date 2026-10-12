import { HORA_MINIMA_ALERTA, agoraNoFuso } from "./alertas-push";

export const MENSAGENS_SEMANAIS = {
  boa_semana: { titulo: "🌷 Boa semana!", corpo: "Que seus dias sejam leves, produtivos e cheios de conquistas. Acredite no seu potencial!", url: "/" },
  boa_sexta: { titulo: "🎉 Ufa! Você conseguiu!", corpo: "Você chegou ao final de mais uma semana! Reconheça suas conquistas e tenha orgulho de tudo o que realizou. 💕", url: "/" },
};
export type TipoSemanal = keyof typeof MENSAGENS_SEMANAIS;

/**
 * A saudação da semana respeita a mesma trava de horário dos alertas: nada é
 * reservado de madrugada, quando o celular dorme e o push expira antes de ser
 * exibido. Ver HORA_MINIMA_ALERTA em alertas-push.ts para a evidência.
 */
export function mensagemSemanal(agora = new Date(), fuso?: string | null) {
  // One-day exception requested by Talita. The second greeting has its own
  // dedup key; subsequent Fridays keep the normal once-per-day behavior.
  const excecao = agoraNoFuso(agora, "America/Sao_Paulo");
  if (excecao.dia === "2026-10-09" && excecao.hora >= 18) {
    return { tipo: "boa_sexta_18h", dia: excecao.dia, ...MENSAGENS_SEMANAIS.boa_sexta };
  }
  const { dia, hora, semana } = agoraNoFuso(agora, fuso);
  if (hora < HORA_MINIMA_ALERTA) return null;
  const tipo = semana === 1 ? "boa_semana" : semana === 5 ? "boa_sexta" : null;
  return tipo ? { tipo, dia, ...MENSAGENS_SEMANAIS[tipo] } : null;
}