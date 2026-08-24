import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, MessageSquareHeart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { feedbackPorToken, responderFeedback } from "@/lib/feedback.functions";
import { PERGUNTAS, TIPO_FEEDBACK_LABEL, ehSemanal, type TipoFeedback } from "@/lib/feedback";

export const Route = createFileRoute("/responder-feedback/$token")({
  head: () => ({
    meta: [
      { title: "Responder feedback | Recruta+" },
      {
        name: "description",
        content: "Avalie em menos de um minuto o atendimento e a equipe alocada na sua empresa.",
      },
      { property: "og:title", content: "Responder feedback | Recruta+" },
      {
        property: "og:description",
        content: "Formulário rápido de avaliação da equipe alocada na sua empresa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Pagina,
});

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-xl">{children}</div>
    </main>
  );
}

function Pagina() {
  const { token } = Route.useParams();
  const carregar = useServerFn(feedbackPorToken);
  const enviar = useServerFn(responderFeedback);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [mencoes, setMencoes] = useState("");
  const [observacao, setObservacao] = useState("");
  const [enviado, setEnviado] = useState(false);

  const consulta = useQuery({
    queryKey: ["feedback-publico", token],
    retry: 1,
    queryFn: () => carregar({ data: { token } }),
  });

  const mutacao = useMutation({
    mutationFn: () => enviar({ data: { token, respostas, mencoes, observacao } }),
    onSuccess: () => setEnviado(true),
  });

  const feedback = consulta.data;
  const perguntas = useMemo(
    () => (feedback ? (PERGUNTAS[feedback.tipo as TipoFeedback] ?? []) : []),
    [feedback],
  );

  if (consulta.isLoading)
    return (
      <Moldura>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando formulário…
        </div>
      </Moldura>
    );

  if (consulta.isError || !feedback)
    return (
      <Moldura>
        <Card>
          <CardHeader>
            <CardTitle>Link indisponível</CardTitle>
            <CardDescription>
              Este link de feedback não é válido ou expirou. Peça um novo link ao seu contato.
            </CardDescription>
          </CardHeader>
        </Card>
      </Moldura>
    );

  if (enviado || feedback.status === "RESPONDIDO")
    return (
      <Moldura>
        <Card>
          <CardHeader className="items-center text-center">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <CardTitle>Obrigado pelo seu retorno!</CardTitle>
            <CardDescription>
              Sua avaliação foi registrada e já está disponível para a nossa equipe.
            </CardDescription>
          </CardHeader>
        </Card>
      </Moldura>
    );

  if (feedback.status === "CANCELADO")
    return (
      <Moldura>
        <Card>
          <CardHeader>
            <CardTitle>Feedback cancelado</CardTitle>
            <CardDescription>Este formulário foi cancelado pela nossa equipe.</CardDescription>
          </CardHeader>
        </Card>
      </Moldura>
    );

  const completo = perguntas.every((p) => respostas[p.chave]);
  const semanal = ehSemanal(feedback.tipo as TipoFeedback);

  return (
    <Moldura>
      <Card>
        <CardHeader>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <MessageSquareHeart className="h-5 w-5" />
          </span>
          <CardTitle className="font-display text-xl">{feedback.empresa_nome}</CardTitle>
          <CardDescription>
            {TIPO_FEEDBACK_LABEL[feedback.tipo as TipoFeedback]}
            {feedback.colaborador_nome ? ` — ${feedback.colaborador_nome}` : ""}
            {feedback.periodo_inicio
              ? ` — período de ${feedback.periodo_inicio} a ${feedback.periodo_fim ?? ""}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {perguntas.map((pergunta) => (
            <div key={pergunta.chave} className="space-y-2">
              <Label className="text-sm font-semibold">{pergunta.titulo}</Label>
              <div className="flex flex-wrap gap-2">
                {pergunta.opcoes.map((opcao) => (
                  <Button
                    key={opcao}
                    type="button"
                    size="sm"
                    variant={respostas[pergunta.chave] === opcao ? "default" : "outline"}
                    onClick={() => setRespostas((r) => ({ ...r, [pergunta.chave]: opcao }))}
                  >
                    {opcao}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          {semanal && (
            <div className="space-y-2">
              <Label htmlFor="mencoes">
                Quer falar sobre alguém específico? <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="mencoes"
                value={mencoes}
                placeholder="Nome do colaborador e o que aconteceu"
                onChange={(e) => setMencoes(e.target.value.slice(0, 500))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observacao">
              Observações <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value.slice(0, 2000))}
            />
          </div>

          {mutacao.isError && (
            <p className="text-sm text-destructive">{(mutacao.error as Error).message}</p>
          )}

          <Button
            className="w-full"
            disabled={!completo || mutacao.isPending}
            onClick={() => mutacao.mutate()}
          >
            {mutacao.isPending ? "Enviando…" : "Enviar avaliação"}
          </Button>
        </CardContent>
      </Card>
    </Moldura>
  );
}
