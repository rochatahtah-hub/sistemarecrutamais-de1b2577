import { useEffect, useRef, useState } from "react";
import { Eye, FileUp, Loader2, Save, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  enviarDocumentoIdentidade,
  removerDocumentoIdentidade,
  urlDocumentoIdentidade,
} from "@/lib/documentos-colaborador";
import { opcoesFuncao, useFuncoes } from "@/lib/funcoes";
import { usePermissoes } from "@/lib/permissoes";
import { usePrivacidade } from "@/lib/privacidade";
import { formatarCPF, useAtualizarDadosCandidato, type RegistroProgramacao } from "@/lib/programacao";
import { useTenantAtual } from "@/lib/tenant";

const SEM_FUNCAO = "__sem_funcao__";

/**
 * Ficha do colaborador dentro da Minha Programação: nome, CPF, telefone,
 * função, chave Pix e documento de identidade — tudo lido e gravado no banco.
 */
export function DialogoColaborador({ registro }: { registro: RegistroProgramacao }) {
  const priv = usePrivacidade();
  const { pode } = usePermissoes();
  const { data: tenant } = useTenantAtual();
  const { data: funcoes = [] } = useFuncoes();
  const atualizar = useAtualizarDadosCandidato();
  const inputArquivo = useRef<HTMLInputElement>(null);

  const [aberto, setAberto] = useState(false);
  const [funcao, setFuncao] = useState(registro.candidato_funcao);
  const [pix, setPix] = useState(registro.candidato_pix);
  const [enviando, setEnviando] = useState(false);

  // Sempre que a lista é recarregada do banco, a ficha reflete o valor salvo.
  useEffect(() => {
    setFuncao(registro.candidato_funcao);
    setPix(registro.candidato_pix);
  }, [registro.candidato_funcao, registro.candidato_pix, aberto]);

  const podeEditar = pode("programacao", "editar");
  const temDocumento = Boolean(registro.candidato_documento_path);
  const opcoes = opcoesFuncao(funcoes, registro.candidato_funcao);

  async function salvarDados() {
    if (!registro.candidato_id) return;
    try {
      await atualizar.mutateAsync({ id: registro.candidato_id, funcao, pix_chave: pix });
      toast.success("Função e Pix salvos no cadastro do colaborador.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function enviarDocumento(arquivo: File) {
    if (!registro.candidato_id) return;
    if (!tenant?.id) {
      toast.error("Empresa ativa não identificada. Recarregue a página.");
      return;
    }
    setEnviando(true);
    try {
      const anterior = registro.candidato_documento_path;
      const { caminho, nome } = await enviarDocumentoIdentidade(
        tenant.id,
        registro.candidato_id,
        arquivo,
      );
      await atualizar.mutateAsync({
        id: registro.candidato_id,
        documento_path: caminho,
        documento_nome: nome,
      });
      if (anterior) await removerDocumentoIdentidade(anterior).catch(() => undefined);
      toast.success("Documento de identidade armazenado com segurança.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
      if (inputArquivo.current) inputArquivo.current.value = "";
    }
  }

  async function abrirDocumento() {
    try {
      const url = await urlDocumentoIdentidade(registro.candidato_documento_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Não foi possível abrir o documento.");
    }
  }

  async function removerDocumento() {
    if (!registro.candidato_id) return;
    try {
      await removerDocumentoIdentidade(registro.candidato_documento_path);
      await atualizar.mutateAsync({
        id: registro.candidato_id,
        documento_path: "",
        documento_nome: "",
      });
      toast.success("Documento removido.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir ficha do colaborador">
          <UserRound className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ficha do colaborador</DialogTitle>
          <DialogDescription>
            Dados vindos do banco e vinculados a esta programação.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Nome</dt>
            <dd className="font-medium">{priv.nome(registro.candidato_nome)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">CPF</dt>
            <dd className="font-medium">
              {registro.candidato_cpf
                ? priv.privado
                  ? priv.cpf(registro.candidato_cpf)
                  : formatarCPF(registro.candidato_cpf)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd className="font-medium">
              {registro.candidato_telefone ? priv.telefone(registro.candidato_telefone) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Empresa</dt>
            <dd className="font-medium">{priv.empresa(registro.empresa)}</dd>
          </div>
        </dl>

        <div className="space-y-3 border-t border-border/70 pt-4">
          <div className="space-y-1.5">
            <Label>Função</Label>
            <Select
              value={funcao || SEM_FUNCAO}
              disabled={!podeEditar}
              onValueChange={(v) => setFuncao(v === SEM_FUNCAO ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_FUNCAO}>Sem função definida</SelectItem>
                {opcoes.map((nome) => (
                  <SelectItem key={nome} value={nome}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pix-colaborador">Chave Pix</Label>
            <Input
              id="pix-colaborador"
              value={priv.privado && !podeEditar ? "•••••" : pix}
              maxLength={140}
              disabled={!podeEditar}
              placeholder="CPF, telefone, e-mail ou chave aleatória"
              onChange={(e) => setPix(e.target.value.slice(0, 140))}
            />
          </div>

          {podeEditar && (
            <Button
              type="button"
              onClick={() => void salvarDados()}
              disabled={atualizar.isPending || !registro.candidato_id}
            >
              <Save className="mr-2 h-4 w-4" />
              {atualizar.isPending ? "Salvando..." : "Salvar função e Pix"}
            </Button>
          )}
        </div>

        <div className="space-y-2 border-t border-border/70 pt-4">
          <Label>Documento de identidade</Label>
          <p className="text-xs text-muted-foreground">
            Armazenamento privado, isolado por empresa. O acesso é sempre por link temporário.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {temDocumento ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => void abrirDocumento()}>
                  <Eye className="mr-2 h-4 w-4" /> Visualizar
                </Button>
                {podeEditar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void removerDocumento()}
                    disabled={atualizar.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remover
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">
                  {registro.candidato_documento_nome || "documento anexado"}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Nenhum documento anexado.</span>
            )}
          </div>
          {podeEditar && (
            <>
              <input
                ref={inputArquivo}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void enviarDocumento(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={enviando || !registro.candidato_id}
                onClick={() => inputArquivo.current?.click()}
              >
                {enviando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileUp className="mr-2 h-4 w-4" />
                )}
                {temDocumento ? "Substituir documento" : "Anexar documento"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
