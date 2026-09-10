import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Archive,
  ChevronRight,
  FileText,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { RequerPermissao } from "@/components/RequerPermissao";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CONFIG_PADRAO,
  FRASE_INSTITUCIONAL,
  MODALIDADE_ROTULO,
  SITUACAO_CLASSE,
  SITUACAO_ROTULO,
  SITUACOES,
  useArquivarOportunidade,
  useAtualizarSituacaoCandidatura,
  type SituacaoCandidatura,
  useCandidaturas,
  useConfigCaptacao,
  useContagemCandidaturas,
  useExcluirCandidatura,
  useOportunidades,
  useRestaurarOportunidade,
  useSalvarConfigCaptacao,
  useSalvarOportunidade,
  useVagasParaCaptacao,
  urlCurriculo,
  type Candidatura,
  type DadosOportunidade,
  type Oportunidade,
} from "@/lib/captacao";
import { useSalvarBloqueio } from "@/lib/bloqueios";
import { usePermissoes } from "@/lib/permissoes";
import { usePrivacidade } from "@/lib/privacidade";
import { formatarCPF, formatarTelefone } from "@/lib/programacao";
import { formatarResumoVaga, GENERO_LABEL, GENEROS, TRANSPORTE_VAGA_LABEL } from "@/lib/tipos";
import { linkWhatsApp } from "@/lib/whatsapp";

export const Route = createFileRoute("/captacao")({
  head: () => ({
    meta: [
      { title: "Configuração de Captação | RECRUTA+" },
      {
        name: "description",
        content:
          "Escolha quais oportunidades ficam disponíveis para os candidatos: diárias, diárias selecionadas e vagas CLT.",
      },
      { property: "og:title", content: "Configuração de Captação | RECRUTA+" },
      {
        property: "og:description",
        content: "Gerencie diárias, diárias selecionadas e vagas CLT disponíveis para candidatura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequerPermissao modulo="captacao" area="Configuração de Captação">
      <Pagina />
    </RequerPermissao>
  ),
});

function Pagina() {
  const { pode } = usePermissoes();
  const { data: config, isPending } = useConfigCaptacao();
  const salvarConfig = useSalvarConfigCaptacao();
  const atual = config ?? CONFIG_PADRAO;

  function alternar(campo: "diarias_ativa" | "oportunidades_ativa" | "clt_ativa", valor: boolean) {
    salvarConfig.mutate(
      { ...atual, [campo]: valor },
      {
        onError: () => toast.error("Você não tem permissão para alterar as modalidades."),
        onSuccess: () => toast.success("Modalidades atualizadas."),
      },
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Configuração de Captação"
        descricao={`${FRASE_INSTITUCIONAL} Escolha o que fica disponível para os candidatos.`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modalidades disponíveis para o candidato</CardTitle>
          <CardDescription>
            Desativar não apaga nada: apenas impede novos cadastros naquela modalidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {isPending ? (
            <>
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </>
          ) : (
            (
              [
                ["diarias_ativa", "diarias"],
                ["oportunidades_ativa", "especifica"],
                ["clt_ativa", "clt"],
              ] as const
            ).map(([campo, chave]) => (
              <div
                key={campo}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
              >
                <span className="text-sm font-semibold">{MODALIDADE_ROTULO[chave]}</span>
                <Switch
                  checked={atual[campo]}
                  disabled={!pode("captacao", "administrar") || salvarConfig.isPending}
                  onCheckedChange={(v) => alternar(campo, v)}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="diarias">
        <TabsList className="flex w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="diarias">DIÁRIAS</TabsTrigger>
          <TabsTrigger value="especifica">DIÁRIAS SELECIONADAS</TabsTrigger>
          <TabsTrigger value="clt">VAGAS CLT</TabsTrigger>
        </TabsList>
        <TabsContent value="diarias" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Diárias</CardTitle>
              <CardDescription>
                O cadastro de diárias continua funcionando exatamente como hoje, pelo link público da
                empresa. Aqui você apenas define se ele aparece para o candidato.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant={atual.diarias_ativa ? "gold" : "secondary"}>
                {atual.diarias_ativa ? "Disponível no portal" : "Oculta no portal"}
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="especifica" className="pt-4">
          <ListaOportunidades modalidade="especifica" />
        </TabsContent>
        <TabsContent value="clt" className="pt-4">
          <ListaOportunidades modalidade="clt" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const VAZIO: DadosOportunidade = {
  modalidade: "especifica",
  vaga_id: null,
  titulo: "",
  data_oportunidade: null,
  descricao: "",
  requisitos: "",
  informacoes_adicionais: "",
  curriculo_obrigatorio: false,
  genero: "",
  cidade: "",
  bairro: "",
  horario_inicio: "",
  horario_fim: "",
  intervalo_inicio: "",
  intervalo_fim: "",
  transporte_tipo: "",
  transporte_detalhes: "",
};

function ListaOportunidades({ modalidade }: { modalidade: "especifica" | "clt" }) {
  const { pode } = usePermissoes();
  const [aba, setAba] = useState<"ativa" | "arquivada">("ativa");
  const [formulario, setFormulario] = useState<DadosOportunidade | null>(null);
  const [verCandidatos, setVerCandidatos] = useState<Oportunidade | null>(null);
  const [restaurar, setRestaurar] = useState<Oportunidade | null>(null);

  const { data: lista, isPending } = useOportunidades(modalidade, aba);
  const { data: contagem } = useContagemCandidaturas();
  const arquivar = useArquivarOportunidade();
  const restaurarM = useRestaurarOportunidade();

  const rotuloNovo = modalidade === "clt" ? "+ Nova vaga CLT" : "+ Nova oportunidade";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={aba} onValueChange={(v) => setAba(v as "ativa" | "arquivada")}>
          <TabsList>
            <TabsTrigger value="ativa">Ativas</TabsTrigger>
            <TabsTrigger value="arquivada">Arquivadas</TabsTrigger>
          </TabsList>
        </Tabs>
        {pode("captacao", "criar") && (
          <Button size="sm" onClick={() => setFormulario({ ...VAZIO, modalidade })}>
            <Plus className="mr-2 h-4 w-4" /> {rotuloNovo}
          </Button>
        )}
      </div>

      {isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : (lista ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma {modalidade === "clt" ? "vaga CLT" : "oportunidade"} {aba === "ativa" ? "ativa" : "arquivada"}.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(lista ?? []).map((o) => (
            <Card key={o.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base leading-snug">{o.titulo || "Sem título"}</CardTitle>
                <CardDescription>
                  {o.data_oportunidade
                    ? new Date(`${o.data_oportunidade}T12:00:00`).toLocaleDateString("pt-BR")
                    : "Sem data definida"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                {o.requisitos && (
                  <p className="whitespace-pre-line text-sm text-muted-foreground">{o.requisitos}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    <Users className="mr-1 h-3 w-3" />
                    {contagem?.get(o.id) ?? 0} cadastro(s)
                  </Badge>
                  {o.curriculo_obrigatorio && <Badge variant="secondary">Currículo obrigatório</Badge>}
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setVerCandidatos(o)}>
                    Cadastros
                  </Button>
                  {pode("captacao", "editar") && aba === "ativa" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setFormulario({
                          ...o,
                          genero: o.genero ?? "",
                          cidade: o.cidade ?? "",
                          bairro: o.bairro ?? "",
                          horario_inicio: o.horario_inicio ?? "",
                          horario_fim: o.horario_fim ?? "",
                          intervalo_inicio: o.intervalo_inicio ?? "",
                          intervalo_fim: o.intervalo_fim ?? "",
                          transporte_tipo: o.transporte_tipo ?? "",
                          transporte_detalhes: o.transporte_detalhes ?? "",
                        })
                      }
                    >
                      Editar
                    </Button>
                  )}
                  {pode("captacao", "arquivar") && aba === "ativa" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={arquivar.isPending}
                      onClick={() =>
                        arquivar.mutate(o.id, {
                          onSuccess: () => toast.success("Arquivada. Nenhum dado foi apagado."),
                          onError: () => toast.error("Não foi possível arquivar."),
                        })
                      }
                    >
                      <Archive className="mr-1 h-4 w-4" /> Arquivar
                    </Button>
                  )}
                  {pode("captacao", "restaurar") && aba === "arquivada" && (
                    <Button size="sm" variant="outline" onClick={() => setRestaurar(o)}>
                      <RotateCcw className="mr-1 h-4 w-4" /> Restaurar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {formulario && (
        <DialogOportunidade dados={formulario} onFechar={() => setFormulario(null)} />
      )}
      {verCandidatos && (
        <DialogCandidatos oportunidade={verCandidatos} onFechar={() => setVerCandidatos(null)} />
      )}

      <Dialog open={Boolean(restaurar)} onOpenChange={(v) => !v && setRestaurar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como deseja restaurar?</DialogTitle>
            <DialogDescription>
              Nada é apagado. Você escolhe se os cadastros anteriores voltam a ficar ativos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              disabled={restaurarM.isPending}
              onClick={() =>
                restaurar &&
                restaurarM.mutate(
                  { id: restaurar.id, comCadastros: false },
                  {
                    onSuccess: () => {
                      toast.success("Restaurada. Os cadastros antigos seguem preservados.");
                      setRestaurar(null);
                    },
                    onError: () => toast.error("Não foi possível restaurar."),
                  },
                )
              }
            >
              Restaurar somente a vaga
            </Button>
            <Button
              disabled={restaurarM.isPending}
              onClick={() =>
                restaurar &&
                restaurarM.mutate(
                  { id: restaurar.id, comCadastros: true },
                  {
                    onSuccess: () => {
                      toast.success("Restaurada com os cadastros anteriores.");
                      setRestaurar(null);
                    },
                    onError: () => toast.error("Não foi possível restaurar."),
                  },
                )
              }
            >
              Restaurar vaga + cadastros anteriores
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DialogOportunidade({
  dados,
  onFechar,
}: {
  dados: DadosOportunidade;
  onFechar: () => void;
}) {
  const [form, setForm] = useState<DadosOportunidade>(dados);
  const salvar = useSalvarOportunidade();
  const { data: vagas } = useVagasParaCaptacao();
  const clt = form.modalidade === "clt";

  const opcoes = useMemo(() => vagas ?? [], [vagas]);

  const camposFaltando = [
    !form.genero && "Gênero",
    !(form.cidade.trim() && form.bairro.trim()) && "Cidade/Bairro",
    !(form.horario_inicio && form.horario_fim) && "Horário",
    !form.transporte_tipo && "Transporte",
  ].filter(Boolean) as string[];

  const erroHorario =
    Boolean(form.horario_inicio) !== Boolean(form.horario_fim)
      ? "Informe início e fim do horário, ou deixe os dois em branco."
      : form.horario_inicio && form.horario_fim && form.horario_fim <= form.horario_inicio
        ? "O horário de término deve ser depois do horário de início."
        : Boolean(form.intervalo_inicio) !== Boolean(form.intervalo_fim)
          ? "Informe início e fim do intervalo, ou deixe os dois em branco."
          : null;

  const resumo = formatarResumoVaga(form);

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{clt ? "Vaga CLT" : "Diária selecionada"}</DialogTitle>
          <DialogDescription>
            Use uma vaga que já existe no sistema e complete as informações do anúncio.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vaga">Vaga existente</Label>
            <select
              id="vaga"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={form.vaga_id ?? ""}
              onChange={(e) => {
                const id = e.target.value || null;
                const escolhida = opcoes.find((v) => v.id === id);
                setForm((a) => ({
                  ...a,
                  vaga_id: id,
                  titulo: a.titulo || (escolhida ? escolhida.cargo : ""),
                  data_oportunidade: a.data_oportunidade ?? escolhida?.data ?? null,
                  // Preenche a partir da vaga só o que ainda estiver em branco — nunca sobrescreve o que já foi digitado.
                  genero: a.genero || escolhida?.genero || "",
                  cidade: a.cidade || escolhida?.cidade || "",
                  bairro: a.bairro || escolhida?.bairro || "",
                  horario_inicio: a.horario_inicio || escolhida?.horario_inicio || "",
                  horario_fim: a.horario_fim || escolhida?.horario_fim || "",
                  transporte_tipo: a.transporte_tipo || escolhida?.transporte_tipo || "",
                }));
              }}
            >
              <option value="">Não vincular a uma vaga</option>
              {opcoes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.cargo} {v.empresa ? `— ${v.empresa}` : ""} (
                  {new Date(`${v.data}T12:00:00`).toLocaleDateString("pt-BR")})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={form.titulo}
              maxLength={160}
              onChange={(e) => setForm((a) => ({ ...a, titulo: e.target.value }))}
              placeholder="Ex.: Auxiliar de carga"
            />
          </div>
          {!clt && (
            <div className="space-y-1.5">
              <Label htmlFor="data">Data da oportunidade</Label>
              <Input
                id="data"
                type="date"
                value={form.data_oportunidade ?? ""}
                onChange={(e) => setForm((a) => ({ ...a, data_oportunidade: e.target.value || null }))}
              />
            </div>
          )}
          <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="rotulo-secao">Perfil e transporte</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Gênero</Label>
                <RadioGroup
                  className="flex flex-wrap gap-4"
                  value={form.genero}
                  onValueChange={(v) => setForm((a) => ({ ...a, genero: v }))}
                >
                  {GENEROS.map((g) => (
                    <div key={g} className="flex items-center gap-2">
                      <RadioGroupItem value={g} id={`op-genero-${g}`} />
                      <Label htmlFor={`op-genero-${g}`} className="font-normal">
                        {GENERO_LABEL[g]}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Transporte</Label>
                <RadioGroup
                  className="flex flex-wrap gap-4"
                  value={form.transporte_tipo}
                  onValueChange={(v) =>
                    setForm((a) => ({
                      ...a,
                      transporte_tipo: v,
                      transporte_detalhes: v === "FRETADO" ? a.transporte_detalhes : "",
                    }))
                  }
                >
                  {(Object.keys(TRANSPORTE_VAGA_LABEL) as (keyof typeof TRANSPORTE_VAGA_LABEL)[]).map((t) => (
                    <div key={t} className="flex items-center gap-2">
                      <RadioGroupItem value={t} id={`op-transporte-${t}`} />
                      <Label htmlFor={`op-transporte-${t}`} className="font-normal">
                        {TRANSPORTE_VAGA_LABEL[t]}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
            {form.transporte_tipo === "FRETADO" && (
              <div className="space-y-1.5">
                <Label htmlFor="op-transporte-detalhes">Detalhes do fretado (opcional)</Label>
                <Textarea
                  id="op-transporte-detalhes"
                  rows={2}
                  value={form.transporte_detalhes}
                  onChange={(e) => setForm((a) => ({ ...a, transporte_detalhes: e.target.value }))}
                  placeholder="Ex.: embarque às 6h na praça central, ônibus fretado, observações..."
                />
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="rotulo-secao">Local e horário</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="op-cidade">Cidade</Label>
                <Input
                  id="op-cidade"
                  value={form.cidade}
                  onChange={(e) => setForm((a) => ({ ...a, cidade: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="op-bairro">Bairro</Label>
                <Input
                  id="op-bairro"
                  value={form.bairro}
                  onChange={(e) => setForm((a) => ({ ...a, bairro: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="op-hora-inicio">Horário de início</Label>
                <Input
                  id="op-hora-inicio"
                  type="time"
                  value={form.horario_inicio}
                  onChange={(e) => setForm((a) => ({ ...a, horario_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="op-hora-fim">Horário de término</Label>
                <Input
                  id="op-hora-fim"
                  type="time"
                  value={form.horario_fim}
                  onChange={(e) => setForm((a) => ({ ...a, horario_fim: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="op-intervalo-inicio">Intervalo — início (opcional)</Label>
                <Input
                  id="op-intervalo-inicio"
                  type="time"
                  value={form.intervalo_inicio}
                  onChange={(e) => setForm((a) => ({ ...a, intervalo_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="op-intervalo-fim">Intervalo — fim (opcional)</Label>
                <Input
                  id="op-intervalo-fim"
                  type="time"
                  value={form.intervalo_fim}
                  onChange={(e) => setForm((a) => ({ ...a, intervalo_fim: e.target.value }))}
                />
              </div>
            </div>
          </section>

          {resumo.length > 0 && (
            <div className="space-y-1 rounded-xl border border-gold/25 bg-gold-soft/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resumo — como aparecerá para o candidato
              </p>
              {resumo.map((linha) => (
                <p key={linha} className="text-sm">
                  {linha}
                </p>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              rows={3}
              value={form.descricao}
              onChange={(e) => setForm((a) => ({ ...a, descricao: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="requisitos">Requisitos para participar</Label>
            <Textarea
              id="requisitos"
              rows={4}
              value={form.requisitos}
              onChange={(e) => setForm((a) => ({ ...a, requisitos: e.target.value }))}
              placeholder="Experiência, horário, transporte, documentação..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="info">Informações adicionais</Label>
            <Textarea
              id="info"
              rows={3}
              value={form.informacoes_adicionais}
              onChange={(e) => setForm((a) => ({ ...a, informacoes_adicionais: e.target.value }))}
            />
          </div>
          {clt && (
            <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-3">
              <div>
                <p className="text-sm font-medium">Currículo obrigatório</p>
                <p className="text-xs text-muted-foreground">
                  O candidato só conclui a candidatura enviando o currículo.
                </p>
              </div>
              <Switch
                checked={form.curriculo_obrigatorio}
                onCheckedChange={(v) => setForm((a) => ({ ...a, curriculo_obrigatorio: v }))}
              />
            </div>
          )}
          {erroHorario && <p className="text-xs text-destructive">{erroHorario}</p>}
          {!erroHorario && camposFaltando.length > 0 && (
            <p className="text-xs text-destructive">
              Complete estes dados antes de publicar: {camposFaltando.join(", ")}.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            disabled={
              form.titulo.trim().length < 3 ||
              camposFaltando.length > 0 ||
              Boolean(erroHorario) ||
              salvar.isPending
            }
            onClick={() =>
              salvar.mutate(form, {
                onSuccess: () => {
                  toast.success("Salvo com sucesso.");
                  onFechar();
                },
                onError: () => toast.error("Você não tem permissão para esta ação."),
              })
            }
          >
            {salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_CANDIDATURA_ROTULO: Record<Candidatura["status"], string> = {
  ativa: "Ativa",
  arquivada: "Arquivada",
};

function DialogCandidatos({
  oportunidade,
  onFechar,
}: {
  oportunidade: Oportunidade;
  onFechar: () => void;
}) {
  const { pode } = usePermissoes();
  const priv = usePrivacidade();
  const { data: lista, isPending } = useCandidaturas(oportunidade.id);
  const excluir = useExcluirCandidatura();
  const atualizarSituacao = useAtualizarSituacaoCandidatura();
  const salvarBloqueio = useSalvarBloqueio();
  const [detalhe, setDetalhe] = useState<Candidatura | null>(null);
  const [excluindo, setExcluindo] = useState<Candidatura | null>(null);
  const [filtro, setFiltro] = useState<SituacaoCandidatura | "todas">("todas");
  const [blacklist, setBlacklist] = useState<Candidatura | null>(null);
  const [motivoBlacklist, setMotivoBlacklist] = useState("");

  const podeAlterarSituacao = pode("captacao", "editar");
  const todos = lista ?? [];
  const visiveis = filtro === "todas" ? todos : todos.filter((c) => (c.situacao ?? "aguardando_contato") === filtro);
  const contar = (s: SituacaoCandidatura) =>
    todos.filter((c) => (c.situacao ?? "aguardando_contato") === s).length;

  function aplicarSituacao(c: Candidatura, situacao: SituacaoCandidatura) {
    if (!podeAlterarSituacao) {
      toast.error("Você não tem permissão para alterar a situação.");
      return;
    }
    if (situacao === "blacklist") {
      setMotivoBlacklist("");
      setBlacklist(c);
      return;
    }
    atualizarSituacao.mutate(
      { id: c.id, situacao },
      {
        onSuccess: () => toast.success(`Situação alterada para "${SITUACAO_ROTULO[situacao]}".`),
        onError: () => toast.error("Não foi possível alterar a situação."),
      },
    );
  }

  async function confirmarBlacklist() {
    if (!blacklist) return;
    const motivo = motivoBlacklist.trim();
    if (motivo.length < 3) {
      toast.error("Informe o motivo da blacklist.");
      return;
    }
    if (!pode("bloqueios", "criar")) {
      toast.error("Você não tem permissão para bloquear colaboradores.");
      return;
    }
    try {
      await salvarBloqueio.mutateAsync({
        cpf: blacklist.cpf,
        nome: blacklist.nome,
        telefone: blacklist.telefone,
        motivo,
        tipo_bloqueio: "TODAS_EMPRESAS",
      });
    } catch (e) {
      // Se o colaborador já estiver bloqueado, seguimos apenas marcando a situação.
      const msg = e instanceof Error ? e.message : "";
      if (!msg.includes("já possui um bloqueio ativo")) {
        toast.error(msg || "Não foi possível registrar o bloqueio.");
        return;
      }
    }
    atualizarSituacao.mutate(
      { id: blacklist.id, situacao: "blacklist" },
      {
        onSuccess: () => {
          toast.success("Colaborador marcado como Blacklist.");
          setBlacklist(null);
        },
        onError: () => toast.error("Não foi possível alterar a situação."),
      },
    );
  }


  async function abrirCurriculo(caminho: string) {
    try {
      const url = await urlCurriculo(caminho);
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Não foi possível abrir o currículo.");
    }
  }

  function confirmarExclusao() {
    if (!excluindo) return;
    excluir.mutate(excluindo.id, {
      onSuccess: () => {
        toast.success("Cadastro excluído. O colaborador continua no RECRUTA+.");
        if (detalhe?.id === excluindo.id) setDetalhe(null);
        setExcluindo(null);
      },
      onError: () => toast.error("Não foi possível excluir."),
    });
  }

  return (
    <>
      <Dialog open onOpenChange={(v) => !v && onFechar()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Cadastros
            </p>
            <DialogTitle className="text-xl leading-snug">{oportunidade.titulo}</DialogTitle>
            <DialogDescription className="text-xs">
              Excluir um cadastro remove apenas esta candidatura — o colaborador continua cadastrado
              no RECRUTA+.
            </DialogDescription>
          </DialogHeader>

          {isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : (lista ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum cadastro ainda.</p>
          ) : (
            <ul className="space-y-3">
              {(lista ?? []).map((c) => {
                const link = priv.privado ? null : linkWhatsApp(c.telefone);
                const telefoneExibido = priv.privado ? priv.telefone(c.telefone) : formatarTelefone(c.telefone);
                return (
                  <li key={c.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setDetalhe(c)}
                        className="group min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-base font-semibold leading-tight group-hover:text-primary">
                          {priv.nome(c.nome)}
                        </p>
                        <span className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-primary/80 group-hover:underline">
                          Ver cadastro <ChevronRight className="h-3 w-3" />
                        </span>
                      </button>
                      <Badge variant={c.status === "ativa" ? "gold" : "secondary"} className="shrink-0">
                        {STATUS_CANDIDATURA_ROTULO[c.status] ?? c.status}
                      </Badge>
                    </div>

                    {c.telefone &&
                      (link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5 shrink-0" /> {telefoneExibido}
                        </a>
                      ) : (
                        <span className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" /> {telefoneExibido}
                        </span>
                      ))}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {link && (
                        <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500">
                          <a href={link} target="_blank" rel="noreferrer">
                            <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setDetalhe(c)}>
                        Ver cadastro
                      </Button>
                      {c.curriculo_path && (
                        <Button size="sm" variant="outline" onClick={() => void abrirCurriculo(c.curriculo_path)}>
                          <FileText className="mr-1.5 h-4 w-4" /> Currículo
                        </Button>
                      )}
                    </div>

                    {pode("captacao", "excluir") && (
                      <div className="mt-3 border-t border-border/60 pt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setExcluindo(c)}
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" /> Excluir cadastro
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <DialogDetalheCandidatura
        candidatura={detalhe}
        oportunidade={oportunidade}
        onFechar={() => setDetalhe(null)}
        onAbrirCurriculo={abrirCurriculo}
      />

      <AlertDialog open={Boolean(excluindo)} onOpenChange={(v) => !v && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este cadastro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove somente a candidatura
              {excluindo ? ` de ${priv.nome(excluindo.nome)}` : ""} nesta vaga. O colaborador
              continuará cadastrado no RECRUTA+.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={excluir.isPending}
              onClick={confirmarExclusao}
            >
              {excluir.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir cadastro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Painel de leitura com os dados já existentes da candidatura — nada é inventado nem editado aqui. */
function DialogDetalheCandidatura({
  candidatura,
  oportunidade,
  onFechar,
  onAbrirCurriculo,
}: {
  candidatura: Candidatura | null;
  oportunidade: Oportunidade;
  onFechar: () => void;
  onAbrirCurriculo: (caminho: string) => void;
}) {
  const priv = usePrivacidade();
  const link = candidatura && !priv.privado ? linkWhatsApp(candidatura.telefone) : null;
  const generoResolvido = oportunidade.genero ?? oportunidade.vaga?.genero ?? null;
  const cidadeResolvida = oportunidade.cidade ?? oportunidade.vaga?.cidade ?? null;
  const bairroResolvido = oportunidade.bairro ?? oportunidade.vaga?.bairro ?? null;
  const horarioInicioResolvido = oportunidade.horario_inicio ?? oportunidade.vaga?.horario_inicio ?? null;
  const horarioFimResolvido = oportunidade.horario_fim ?? oportunidade.vaga?.horario_fim ?? null;
  const transporteTipoResolvido = oportunidade.transporte_tipo ?? oportunidade.vaga?.transporte_tipo ?? null;
  const transporteDetalhesResolvido =
    oportunidade.transporte_detalhes ?? oportunidade.vaga?.transporte_detalhes ?? null;

  return (
    <Dialog open={Boolean(candidatura)} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dados do cadastro</DialogTitle>
        </DialogHeader>

        {candidatura && (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold leading-tight">{priv.nome(candidatura.nome)}</p>
              <Badge
                variant={candidatura.status === "ativa" ? "gold" : "secondary"}
                className="mt-2"
              >
                {STATUS_CANDIDATURA_ROTULO[candidatura.status] ?? candidatura.status}
              </Badge>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {candidatura.telefone && (
                <div>
                  <dt className="text-xs text-muted-foreground">Telefone</dt>
                  <dd className="font-medium">
                    {priv.privado ? priv.telefone(candidatura.telefone) : formatarTelefone(candidatura.telefone)}
                  </dd>
                </div>
              )}
              {candidatura.cpf && (
                <div>
                  <dt className="text-xs text-muted-foreground">CPF</dt>
                  <dd className="font-medium">
                    {priv.privado ? priv.cpf(candidatura.cpf) : formatarCPF(candidatura.cpf)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Data do cadastro</dt>
                <dd className="font-medium">
                  {new Date(candidatura.created_at).toLocaleDateString("pt-BR")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tipo de cadastro</dt>
                <dd className="font-medium">{MODALIDADE_ROTULO[oportunidade.modalidade]}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Vaga</dt>
                <dd className="font-medium">{oportunidade.titulo}</dd>
              </div>
              {oportunidade.data_oportunidade && (
                <div>
                  <dt className="text-xs text-muted-foreground">Data da oportunidade</dt>
                  <dd className="font-medium">
                    {new Date(`${oportunidade.data_oportunidade}T12:00:00`).toLocaleDateString("pt-BR")}
                  </dd>
                </div>
              )}
              {generoResolvido && (
                <div>
                  <dt className="text-xs text-muted-foreground">Gênero</dt>
                  <dd className="font-medium">{GENERO_LABEL[generoResolvido] ?? generoResolvido}</dd>
                </div>
              )}
              {(cidadeResolvida || bairroResolvido) && (
                <div>
                  <dt className="text-xs text-muted-foreground">Local</dt>
                  <dd className="font-medium">
                    {[cidadeResolvida, bairroResolvido].filter(Boolean).join(" — ")}
                  </dd>
                </div>
              )}
              {horarioInicioResolvido && horarioFimResolvido && (
                <div>
                  <dt className="text-xs text-muted-foreground">Horário</dt>
                  <dd className="font-medium">
                    {horarioInicioResolvido} às {horarioFimResolvido}
                  </dd>
                </div>
              )}
              {transporteTipoResolvido && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Transporte</dt>
                  <dd className="font-medium">
                    {TRANSPORTE_VAGA_LABEL[transporteTipoResolvido] ?? transporteTipoResolvido}
                    {transporteTipoResolvido === "FRETADO" && transporteDetalhesResolvido
                      ? ` — ${transporteDetalhesResolvido}`
                      : ""}
                  </dd>
                </div>
              )}
            </dl>

            {oportunidade.requisitos && (
              <div>
                <p className="text-xs text-muted-foreground">Requisitos da oportunidade</p>
                <p className="mt-1 whitespace-pre-line text-sm">{oportunidade.requisitos}</p>
              </div>
            )}

            {candidatura.curriculo_path && (
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Currículo</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAbrirCurriculo(candidatura.curriculo_path)}
                >
                  <FileText className="mr-1.5 h-4 w-4" /> Visualizar currículo
                </Button>
              </div>
            )}

            {link && (
              <Button asChild className="w-full bg-emerald-600 text-white hover:bg-emerald-500">
                <a href={link} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </a>
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
