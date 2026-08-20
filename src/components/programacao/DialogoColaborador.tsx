import { useRef, useState } from "react";
import { Eye, FileUp, Loader2, Trash2, UserRound } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  enviarDocumentoIdentidade,
  removerDocumentoIdentidade,
  urlDocumentoIdentidade,
} from "@/lib/documentos-colaborador";
import { usePermissoes } from "@/lib/permissoes";
import { usePrivacidade } from "@/lib/privacidade";
import {
  formatarCPF,
  rotuloTransporte,
  useAtualizarDadosCandidato,
  type RegistroProgramacao,
} from "@/lib/programacao";
import { useTenantAtual } from "@/lib/tenant";

/**
 * Ficha do colaborador exibida na Minha Programação. Todos os dados vêm da
 * ficha do colaborador (tabela candidatos) — aqui só são consultados, exceto
 * o documento de identidade, que pode ser anexado/substituído/removido por
 * quem tem permissão (e continua gravado na própria ficha).
 */
export function DialogoColaborador({ registro }: { registro: RegistroProgramacao }) {
  const priv = usePrivacidade();
  const { pode } = usePermissoes();
  const { data: tenant } = useTenantAtual();
  const atualizar = useAtualizarDadosCandidato();
  const inputArquivo = useRef<HTMLInputElement>(null);

  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const podeEditar = pode("programacao", "editar");
  const temDocumento = Boolean(registro.candidato_documento_path);

  const transporte = registro.candidato_transporte_proprio
    ? registro.candidato_transporte_tipos.map(rotuloTransporte).join(", ") || "Transporte próprio"
    : registro.candidato_precisa_fretado
      ? "Precisa de fretado"
      : "Não informado";

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
            Dados puxados automaticamente da ficha do colaborador. Para alterar nome, função ou
            Pix, edite a ficha — a programação reflete a mudança na hora.
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
          <div>
            <dt className="text-muted-foreground">Função</dt>
            <dd className="font-medium">{registro.candidato_funcao || "Função não cadastrada"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Chave Pix</dt>
            <dd className="font-medium">
              {registro.candidato_pix
                ? priv.privado
                  ? priv.texto(registro.candidato_pix)
                  : registro.candidato_pix
                : "Pix não cadastrado"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Transporte</dt>
            <dd className="font-medium">{transporte}</dd>
            {registro.candidato_transporte_observacao && (
              <dd className="text-xs text-muted-foreground">
                {registro.candidato_transporte_observacao}
              </dd>
            )}
          </div>
        </dl>

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
              <span className="text-xs text-muted-foreground">
                Nenhum documento anexado na ficha.
              </span>
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
