/** Um término anterior ao início pertence ao dia seguinte, não é um horário inválido. */
export function validarHorariosOportunidade(dados: {
  horario_inicio: string;
  horario_fim: string;
  intervalo_inicio: string;
  intervalo_fim: string;
}): string | null {
  if (Boolean(dados.horario_inicio) !== Boolean(dados.horario_fim)) {
    return "Informe início e fim do horário, ou deixe os dois em branco.";
  }
  if (dados.horario_inicio && dados.horario_fim && dados.horario_inicio.slice(0, 5) === dados.horario_fim.slice(0, 5)) {
    return "O horário de início e o de término devem ser diferentes.";
  }
  if (Boolean(dados.intervalo_inicio) !== Boolean(dados.intervalo_fim)) {
    return "Informe início e fim do intervalo, ou deixe os dois em branco.";
  }
  return null;
}