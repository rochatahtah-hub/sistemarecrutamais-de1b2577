import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useExcluirMensagemDiaria,
  useMensagensDiarias,
  useSalvarMensagemDiaria,
  type EntradaMensagem,
  type MensagemDiariaRegistro,
} from "@/lib/mensagens-diarias";
import type { TipoMensagem } from "@/lib/mensagem-do-dia";
import { usePermissoes } from "@/lib/permissoes";

const TIPOS: { valor: TipoMensagem; rotulo: string }[] = [
  { valor: "motivacional", rotulo: "Motivacional" },
  { valor: "versiculo", rotulo: "Versículo bíblico" },
  { valor: "reflexao", rotulo: "Reflexão" },
  { valor: "gratidao", rotulo: "Gratidão" },
  { valor: "forca", rotulo: "Força e coragem" },
  { valor: "fe", rotulo: "Fé e esperança" },
  { valor: "profissional", rotulo: "Profissional" },
];

const VAZIA: EntradaMensagem = {
  texto: "",
  tipo: "motivacional",
  referencia: null,
  dataEspecifica: null,
  ativa: true,
};

/**
 * Cadastro das frases que acompanham a saudação do Dashboard.
 *
 * Cada ação tem a sua própria permissão: quem só pode ver não vê os botões, e
 * mesmo que chame a API direto a policy do banco recusa. Mensagem global (a que
 * vale para todas as empresas) aparece marcada e só o Admin Master consegue
 * alterar — daqui ela é somente leitura para os demais.
 */
export function GerenciarMensagensDiarias() {
  const { pode } = usePermissoes();
  const podeCriar = pode("mensagens_diarias", "criar");
  const podeEditar = pode("mensagens_diarias", "editar");
  const podeExcluir = pode("mensagens_diarias", "excluir");

  const { data: mensagens = [], isLoading } = useMensagensDiarias();
  const salvar = useSalvarMensagemDiaria();
  const excluir = useExcluirMensagemDiaria();
  const [form, setForm] = useState<EntradaMensagem | null>(null);

  function editar(m: MensagemDiariaRegistro) {
    setForm({
      id: m.id,
      texto: m.texto,
      tipo: m.tipo,
      referencia: m.referencia,
      dataEspecifica: m.dataEspecifica,
      ativa: m.ativa,
    });
  }

  function gravar() {
    if (!form) return;
    salvar.mutate(form, {
      onSuccess: () => {
        setForm(null);
        toast.success(form.id ? "Mensagem atualizada." : "Mensagem cadastrada.");
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar."),
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Mensagem do Dia</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Frases exibidas abaixo da saudação no Dashboard. Muda sozinha a cada dia.
          </p>
        </div>
        {podeCriar && !form && (
          <Button size="sm" onClick={() => setForm({ ...VAZIA })}>
            <Plus className="mr-2 h-4 w-4" /> Nova mensagem
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {form && (
          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="space-y-1.5">
              <Label htmlFor="msg-texto">Mensagem</Label>
              <Input
                id="msg-texto"
                value={form.texto}
                maxLength={280}
                placeholder="Você é forte e corajosa. Acredite no seu potencial."
                onChange={(e) => setForm({ ...form, texto: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{form.texto.length}/280</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm({ ...form, tipo: v as TipoMensagem })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t.valor} value={t.valor}>
                        {t.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.tipo === "versiculo" && (
                <div className="space-y-1.5">
                  <Label htmlFor="msg-ref">Referência</Label>
                  <Input
                    id="msg-ref"
                    value={form.referencia ?? ""}
                    placeholder="Josué 1:9"
                    onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="msg-data">Data específica (opcional)</Label>
                <Input
                  id="msg-data"
                  type="date"
                  value={form.dataEspecifica ?? ""}
                  onChange={(e) => setForm({ ...form, dataEspecifica: e.target.value || null })}
                />
                <p className="text-xs text-muted-foreground">
                  Se preenchida, a frase aparece exatamente nesse dia e fica fora do rodízio.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="msg-ativa">Ativa</Label>
              <Switch
                id="msg-ativa"
                checked={form.ativa}
                onCheckedChange={(v) => setForm({ ...form, ativa: v })}
              />
            </div>
            <div className="flex gap-2">
              <Button disabled={salvar.isPending} onClick={gravar}>
                {salvar.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button variant="outline" onClick={() => setForm(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Situação</TableHead>
                  {(podeEditar || podeExcluir) && (
                    <TableHead className="text-right">Ações</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mensagens.map((m) => {
                  const global = m.tenantId === null;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="max-w-md">
                        <p className="text-sm">{m.texto}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {m.referencia && <span>{m.referencia}</span>}
                          {m.dataEspecifica && <span>Fixa em {m.dataEspecifica}</span>}
                          {global && <Badge variant="outline">Global</Badge>}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {TIPOS.find((t) => t.valor === m.tipo)?.rotulo ?? m.tipo}
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.ativa ? "default" : "outline"}>
                          {m.ativa ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      {(podeEditar || podeExcluir) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {podeEditar && (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Editar mensagem"
                                onClick={() => editar(m)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {podeExcluir && (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Excluir mensagem"
                                disabled={excluir.isPending}
                                onClick={() =>
                                  excluir.mutate(m.id, {
                                    onSuccess: () => toast.success("Mensagem excluída."),
                                    onError: () => toast.error("Não foi possível excluir."),
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {mensagens.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      Nenhuma mensagem cadastrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
