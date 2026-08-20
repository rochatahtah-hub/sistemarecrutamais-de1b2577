import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { CamposTransporte } from "@/components/programacao/CamposTransporte";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";
import {
  PERIODOS,
  cpfValido,
  normalizarNomeColaborador,
  formatarCpf,
  formatarTelefone,
  soDigitosTelefone,
  useAtualizarColaboradorDiaria,
  useCriarColaboradorDiaria,
  type ColaboradorDiaria,
} from "@/lib/diarias";
import { TRANSPORTE_PADRAO, type DadosTransporte } from "@/lib/programacao";
import { useTenantAtual } from "@/lib/tenant";
import {
  documentoValido,
  enviarDocumentoIdentidade,
  removerDocumentoIdentidade,
  urlDocumentoIdentidade,
} from "@/lib/documentos-colaborador";

interface FormularioColaboradorProps {
  aberto: boolean;
  colaborador: ColaboradorDiaria | null;
  onOpenChange: (aberto: boolean) => void;
}

export function FormularioColaborador({ aberto, colaborador, onOpenChange }: FormularioColaboradorProps) {
  const criar = useCriarColaboradorDiaria();
  const atualizar = useAtualizarColaboradorDiaria();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [disponivel, setDisponivel] = useState(true);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [funcao, setFuncao] = useState("");
  const [transporte, setTransporte] = useState<DadosTransporte>(TRANSPORTE_PADRAO);
  const [pix, setPix] = useState("");
  const [documentoPath, setDocumentoPath] = useState("");
  const [documentoNome, setDocumentoNome] = useState("");
  const [arquivoNovo, setArquivoNovo] = useState<File | null>(null);
  const [enviandoDoc, setEnviandoDoc] = useState(false);
  const inputArquivo = useRef<HTMLInputElement | null>(null);
  const { data: empresaAtiva } = useTenantAtual();

  useEffect(() => {
    if (!aberto) return;
    setNome(colaborador?.full_name ?? "");
    setTelefone(colaborador?.phone ?? "");
    setCpf("");
    setCidade(colaborador?.city ?? "");
    setBairro(colaborador?.neighborhood ?? "");
    setDisponivel(colaborador?.available_for_daily ?? true);
    setPeriodos(colaborador?.available_periods ?? []);
    setFuncao(colaborador?.desired_role ?? "");
    setPix(colaborador?.pix_chave ?? "");
    setDocumentoPath(colaborador?.documento_path ?? "");
    setDocumentoNome(colaborador?.documento_nome ?? "");
    setArquivoNovo(null);
    setTransporte({
      transporte_proprio: colaborador?.transporte_proprio ?? false,
      transporte_tipos: [...(colaborador?.transporte_tipos ?? [])],
      precisa_fretado: colaborador?.precisa_fretado ?? false,
      transporte_observacao: colaborador?.transporte_observacao ?? "",
    });
  }, [aberto, colaborador]);

  const editando = Boolean(colaborador);
  const valido =
    nome.trim().length >= 3 &&
    soDigitosTelefone(telefone).length >= 10 &&
    (editando || cpfValido(cpf)) &&
    cidade.trim().length >= 2 &&
    bairro.trim().length >= 2;
  const salvando = criar.isPending || atualizar.isPending || enviandoDoc;

  function alternarPeriodo(periodo: string, marcado: boolean) {
    setPeriodos((atuais) =>
      marcado ? Array.from(new Set([...atuais, periodo])) : atuais.filter((item) => item !== periodo),
    );
  }

  async function anexarDocumento(colaboradorId: string) {
    if (!arquivoNovo) return null;
    if (!empresaAtiva?.id) throw new Error("Empresa ativa não identificada.");
    const anterior = documentoPath;
    const enviado = await enviarDocumentoIdentidade(empresaAtiva.id, colaboradorId, arquivoNovo);
    if (anterior) await removerDocumentoIdentidade(anterior).catch(() => undefined);
    return enviado;
  }

  async function abrirDocumento() {
    if (!documentoPath) return;
    try {
      const url = await urlDocumentoIdentidade(documentoPath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Não foi possível abrir o documento.");
    }
  }

  async function removerDocumentoAtual() {
    if (!colaborador || !documentoPath) return;
    setEnviandoDoc(true);
    try {
      await removerDocumentoIdentidade(documentoPath);
      await atualizar.mutateAsync({ id: colaborador.id, dados: { documento_path: "", documento_nome: "" } });
      setDocumentoPath("");
      setDocumentoNome("");
      toast.success("Documento removido.");
    } catch {
      toast.error("Não foi possível remover o documento.");
    } finally {
      setEnviandoDoc(false);
    }
  }

  function salvar() {
    if (!valido || salvando || enviandoDoc) return;
    const dadosComuns = {
      full_name: nome.trim().slice(0, 120),
      phone: telefone,
      city: cidade.trim().slice(0, 80),
      neighborhood: bairro.trim().slice(0, 80),
      available_for_daily: disponivel,
      available_periods: periodos,
      desired_role: funcao.trim().slice(0, 120),
      pix_chave: pix,
      ...transporte,
    };

    setEnviandoDoc(Boolean(arquivoNovo));
    void (async () => {
      try {
        if (colaborador) {
          const enviado = await anexarDocumento(colaborador.id);
          await atualizar.mutateAsync({
            id: colaborador.id,
            dados: {
              ...dadosComuns,
              ...(enviado ? { documento_path: enviado.caminho, documento_nome: enviado.nome } : {}),
            },
          });
          toast.success("Colaborador atualizado.");
        } else {
          const novoId = await criar.mutateAsync({ ...dadosComuns, cpf, available_days: [] });
          const enviado = await anexarDocumento(novoId);
          if (enviado) {
            await atualizar.mutateAsync({
              id: novoId,
              dados: { documento_path: enviado.caminho, documento_nome: enviado.nome },
            });
          }
          toast.success("Colaborador cadastrado.");
        }
        onOpenChange(false);
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o colaborador.");
      } finally {
        setEnviandoDoc(false);
      }
    })();
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar colaborador" : "Cadastrar colaborador"}</DialogTitle>
          <DialogDescription>
            {editando ? "Atualize os dados vinculados a este colaborador." : "Inclua um colaborador no banco de diárias."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="colaborador-nome">Nome completo *</Label>
            <Input
              id="colaborador-nome"
              value={nome}
              maxLength={120}
              onChange={(e) => setNome(normalizarNomeColaborador(e.target.value))}
              placeholder="TALITAGONCALVESDAROCHA"
            />
            <p className="text-xs text-muted-foreground">Sem espaços, acentos ou símbolos — sempre em caixa alta.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="colaborador-telefone">Telefone / WhatsApp *</Label>
            <Input
              id="colaborador-telefone"
              inputMode="tel"
              value={formatarTelefone(telefone)}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="colaborador-cpf">CPF *</Label>
            {editando ? (
              <Input id="colaborador-cpf" value={colaborador?.cpf_mascara || "CPF preservado"} disabled />
            ) : (
              <Input
                id="colaborador-cpf"
                inputMode="numeric"
                value={formatarCpf(cpf)}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="colaborador-funcao">Função de interesse</Label>
            <Input id="colaborador-funcao" value={funcao} maxLength={120} onChange={(e) => setFuncao(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="colaborador-cidade">Cidade *</Label>
            <Input id="colaborador-cidade" value={cidade} maxLength={80} onChange={(e) => setCidade(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="colaborador-bairro">Bairro *</Label>
            <Input id="colaborador-bairro" value={bairro} maxLength={80} onChange={(e) => setBairro(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border px-3.5 py-3">
          <Label htmlFor="colaborador-disponivel">Disponível para diárias</Label>
          <Switch id="colaborador-disponivel" checked={disponivel} onCheckedChange={setDisponivel} />
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3.5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">DADOS PARA PAGAMENTO</p>
          <div className="space-y-1.5">
            <Label htmlFor="colaborador-pix">Chave Pix</Label>
            <Input
              id="colaborador-pix"
              value={pix}
              maxLength={140}
              onChange={(e) => setPix(e.target.value)}
              placeholder="CPF, telefone, e-mail ou chave aleatória"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3.5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">DOCUMENTO DE IDENTIDADE</p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG ou PDF (até 10 MB). O arquivo fica em área privada, visível apenas para usuários
            autorizados da empresa.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputArquivo}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={(e) => {
                const arquivo = e.target.files?.[0] ?? null;
                if (!arquivo) return;
                const erro = documentoValido(arquivo);
                if (erro) {
                  toast.error(erro);
                  e.target.value = "";
                  return;
                }
                setArquivoNovo(arquivo);
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => inputArquivo.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              {documentoPath || arquivoNovo ? "Substituir documento" : "Anexar documento"}
            </Button>
            {documentoPath && !arquivoNovo && (
              <Button type="button" variant="outline" size="sm" onClick={() => void abrirDocumento()}>
                <FileText className="mr-2 h-4 w-4" /> Visualizar
              </Button>
            )}
            {documentoPath && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={enviandoDoc}
                onClick={() => void removerDocumentoAtual()}
              >
                <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Remover
              </Button>
            )}
          </div>
          <p className="text-xs">
            {arquivoNovo
              ? `Novo arquivo selecionado: ${arquivoNovo.name}`
              : documentoPath
                ? `Identidade: disponível${documentoNome ? ` (${documentoNome})` : ""}`
                : "Identidade: não enviada"}
          </p>
        </div>

        <CamposTransporte
          titulo="TRANSPORTE"
          valor={transporte}
          onChange={(parcial) => setTransporte((atual) => ({ ...atual, ...parcial }))}
          idPrefixo={`colaborador-${colaborador?.id ?? "novo"}-transporte`}
        />

        <div className="space-y-2">
          <Label>Períodos disponíveis</Label>
          <div className="flex flex-wrap gap-4">
            {PERIODOS.map((periodo) => (
              <div key={periodo} className="flex items-center gap-2">
                <Checkbox
                  id={`colaborador-periodo-${periodo}`}
                  checked={periodos.includes(periodo)}
                  onCheckedChange={(marcado) => alternarPeriodo(periodo, marcado === true)}
                />
                <Label htmlFor={`colaborador-periodo-${periodo}`} className="font-normal">{periodo}</Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} disabled={!valido || salvando}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}