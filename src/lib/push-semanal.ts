import { agoraNoFuso } from "./alertas-push";

export const MENSAGENS_SEMANAIS = {
  boa_semana: { titulo: "🌷 Boa semana!", corpo: "Que seus dias sejam leves, produtivos e cheios de conquistas. Acredite no seu potencial!", url: "/" },
  boa_sexta: { titulo: "🎉 Ufa! Você conseguiu!", corpo: "Você chegou ao final de mais uma semana! Reconheça suas conquistas e tenha orgulho de tudo o que realizou. 💕", url: "/" },
};
export type TipoSemanal = keyof typeof MENSAGENS_SEMANAIS;
export function mensagemSemanal(agora = new Date(), fuso?: string | null) {
  const { dia, semana } = agoraNoFuso(agora, fuso);
  const tipo = semana === 1 ? "boa_semana" : semana === 5 ? "boa_sexta" : null;
  return tipo ? { tipo, dia, ...MENSAGENS_SEMANAIS[tipo] } : null;
}