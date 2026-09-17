/**
 * Escapa texto digitado por gente antes de colocá-lo dentro de HTML.
 *
 * Usado nos e-mails que saem para contatos das empresas: o nome da empresa é
 * preenchido por usuário do sistema e, sem escapar, `<script>`, `<img onerror>`
 * ou um `<a href>` disfarçado viram marcação real num e-mail assinado como
 * Recruta+. Aqui o conteúdo sempre vira texto — nunca marcação.
 *
 * Isto é para interpolar TEXTO em HTML. Não serve para "limpar" HTML que se
 * pretende renderizar: nesse caso o certo é uma allowlist de tags.
 */
export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
