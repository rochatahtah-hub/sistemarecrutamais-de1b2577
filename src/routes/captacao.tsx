import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Archive, FileText, Loader2, Plus, RotateCcw, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { RequerPermissao } from "@/components/RequerPermissao";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CONFIG_PADRAO,
  FRASE_INSTITUCIONAL,
  MODALIDADE_ROTULO,
  useArquivarOportunidade,
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
  type DadosOportunidade,
  type Oportunidade,
} from "@/lib/captacao";
import { usePermissoes } from "@/lib/permissoes";

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
                    <Button size="sm" variant="outline" onClick={() => setFormulario({ ...o })}>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            disabled={form.titulo.trim().length < 3 || salvar.isPending}
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

function DialogCandidatos({
  oportunidade,
  onFechar,
}: {
  oportunidade: Oportunidade;
  onFechar: () => void;
}) {
  const { pode } = usePermissoes();
  const { data: lista, isPending } = useCandidaturas(oportunidade.id);
  const excluir = useExcluirCandidatura();

  async function abrirCurriculo(caminho: string) {
    try {
      const url = await urlCurriculo(caminho);
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Não foi possível abrir o currículo.");
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastros — {oportunidade.titulo}</DialogTitle>
          <DialogDescription>
            Excluir um cadastro remove apenas esta candidatura, nunca o colaborador.
          </DialogDescription>
        </DialogHeader>
        {isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : (lista ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum cadastro ainda.</p>
        ) : (
          <ul className="space-y-2">
            {(lista ?? []).map((c) => (
              <li key={c.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">{c.telefone}</p>
                  </div>
                  <Badge variant={c.status === "ativa" ? "gold" : "secondary"}>{c.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {c.curriculo_path && (
                    <Button size="sm" variant="outline" onClick={() => void abrirCurriculo(c.curriculo_path)}>
                      <FileText className="mr-1 h-4 w-4" /> Currículo
                    </Button>
                  )}
                  {pode("captacao", "excluir") && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={excluir.isPending}
                      onClick={() => {
                        if (!window.confirm("Excluir somente esta candidatura?")) return;
                        excluir.mutate(c.id, {
                          onSuccess: () => toast.success("Candidatura excluída."),
                          onError: () => toast.error("Não foi possível excluir."),
                        });
                      }}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Excluir
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
