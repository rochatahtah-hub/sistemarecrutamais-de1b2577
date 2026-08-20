import { useEffect, useRef, useState } from "react";
import {
  ClipboardPaste,
  FileUp,
  Loader2,
  Pencil,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CamposTransporte } from "@/components/programacao/CamposTransporte";
import { opcoesFuncao, useFuncoes } from "@/lib/funcoes";
import {
  formatarCPF,
  formatarTelefone,
  soDigitos,
  useSalvarCandidato,
  useAtualizarTransporte,
  TRANSPORTE_PADRAO,
  type Candidato,
  type DadosTransporte,
} from "@/lib/programacao";
import { buscarCandidatoPorCPF } from "@/lib/programacao";
import { normalizarNomeColaborador } from "@/lib/diarias";
import { buscarBloqueio, type BloqueioAtivo } from "@/lib/bloqueios";
import { camposFaltantes, interpretarFicha } from "@/lib/ficha-texto";
import { extrairFicha } from "@/lib/ficha.functions";
import { usePrivacidade } from "@/lib/privacidade";

interface Props {
  onCandidato: (c: Candidato | null) => void;
  candidato: Candidato | null;
  onBloqueio?: (b: BloqueioAtivo | null) => void;
  /** Ao mudar, limpa a ficha para um novo registro. */
  resetSinal?: number;
  /** Exibe os campos de transporte (dados cadastrais do candidato). */
  mostrarTransporte?: boolean;
  /** Exibe o seletor de função da ficha (oculto na Minha Programação). */
  mostrarFuncao?: boolean;
}

/** Ficha do candidato: cole o texto ou importe o arquivo; usa somente nome, CPF e telefone. */
/** Valor auxiliar do seletor: o Radix não aceita item com valor vazio. */
const SEM_FUNCAO = "__sem_funcao__";

export function FichaCandidato({
  onCandidato,
  candidato,
  onBloqueio,
  resetSinal = 0,
  mostrarTransporte = true,
  mostrarFuncao = true,
}: Props) {
  const priv = usePrivacidade();
  const inputArquivo = useRef<HTMLInputElement>(null);
  const campoFicha = useRef<HTMLTextAreaElement>(null);
  const processamentoAtual = useRef(0);
  const montado = useRef(true);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [lendo, setLendo] = useState(false);
  const [aviso, setAviso] = useState("");
  const [pendencias, setPendencias] = useState<string[]>([]);
  const [bloqueio, setBloqueio] = useState<BloqueioAtivo | null>(null);
  const [liberado, setLiberado] = useState(false);
  const [previsualizando, setPrevisualizando] = useState(false);
  const [transporte, setTransporte] = useState<DadosTransporte>(TRANSPORTE_PADRAO);
  const [funcao, setFuncao] = useState("");
  const [pix, setPix] = useState("");
  const { data: funcoes = [] } = useFuncoes();
  const salvar = useSalvarCandidato();
  const atualizarTransporte = useAtualizarTransporte();

  const mudarTransporte = (parcial: Partial<DadosTransporte>) =>
    setTransporte((atual) => ({ ...atual, ...parcial }));

  // Carrega o transporte já salvo do candidato selecionado.
  useEffect(() => {
    if (!candidato) return;
    setTransporte({
      transporte_proprio: candidato.transporte_proprio ?? false,
      transporte_tipos: candidato.transporte_tipos ?? [],
      precisa_fretado: candidato.precisa_fretado ?? false,
      transporte_observacao: candidato.transporte_observacao ?? "",
    });
    setFuncao(candidato.funcao ?? "");
    setPix(candidato.pix_chave ?? "");
  }, [candidato]);

  // Com o CPF completo, traz o transporte já cadastrado para não sobrescrever com valores vazios.
  useEffect(() => {
    const digitos = soDigitos(cpf);
    if (digitos.length !== 11 || candidato) return;
    let cancelado = false;
    void buscarCandidatoPorCPF(digitos)
      .then((existente) => {
        if (cancelado || !existente) return;
        setTransporte({
          transporte_proprio: existente.transporte_proprio ?? false,
          transporte_tipos: existente.transporte_tipos ?? [],
          precisa_fretado: existente.precisa_fretado ?? false,
          transporte_observacao: existente.transporte_observacao ?? "",
        });
        setFuncao(existente.funcao ?? "");
        setPix(existente.pix_chave ?? "");
      })
      .catch(() => {
        /* sem cadastro anterior: mantém o preenchimento atual */
      });
    return () => {
      cancelado = true;
    };
  }, [cpf, candidato]);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      processamentoAtual.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!resetSinal) return;
    processamentoAtual.current += 1;
    if (campoFicha.current) campoFicha.current.value = "";
    setNome("");
    setCpf("");
    setTelefone("");
    setAviso("");
    setPendencias([]);
    setBloqueio(null);
    setLiberado(false);
    setPrevisualizando(false);
    setLendo(false);
    setTransporte(TRANSPORTE_PADRAO);
    if (inputArquivo.current) inputArquivo.current.value = "";
  }, [resetSinal]);

  function definirBloqueio(b: BloqueioAtivo | null) {
    setBloqueio(b);
    setLiberado(!b);
    onBloqueio?.(b);
    if (b) onCandidato(null);
  }

  function aplicarDados(dados: { nome: string; cpf: string; telefone: string }) {
    if (dados.nome) setNome(normalizarNomeColaborador(dados.nome));
    if (dados.cpf) setCpf(formatarCPF(dados.cpf));
    if (dados.telefone) setTelefone(formatarTelefone(dados.telefone));
  }

  async function usarFichaColada(textoBruto?: string) {
    const idProcessamento = processamentoAtual.current + 1;
    processamentoAtual.current = idProcessamento;
    const original =
      typeof textoBruto === "string" ? textoBruto : (campoFicha.current?.value ?? "");
    if (typeof original !== "string") return;
    // O texto integral permanece no campo. Só uma cópia limitada entra no parser.
    const texto = original.slice(0, 50_000).trim();
    if (texto.length < 5) {
      setPendencias(["Não foi possível identificar os dados necessários nesta ficha."]);
      setPrevisualizando(false);
      toast.error("Não foi possível processar esta ficha. Confira o conteúdo e tente novamente.");
      return;
    }
    if (!montado.current) return;
    setLendo(true);
    setPendencias([]);
    try {
      let dados = interpretarFicha(texto);
      if (!dados.cpf || !dados.nome || !dados.telefone) {
        try {
          const ia = await extrairFicha({ data: { texto: texto.slice(0, 20_000) } });
           if (!montado.current || processamentoAtual.current !== idProcessamento) return;
          dados = {
            nome: dados.nome || ia.nome,
            cpf: dados.cpf || ia.cpf,
            telefone: dados.telefone || ia.telefone,
          };
        } catch {
          /* mantém a leitura local */
        }
      }
      if (!montado.current || processamentoAtual.current !== idProcessamento) return;
      aplicarDados(dados);
      const faltas = camposFaltantes(dados);
      setPendencias(faltas);
      setPrevisualizando(faltas.length === 0);
      if (faltas.length === 0) toast.success("✓ FICHA PROCESSADA");
      else toast.warning("⚠ NÃO FOI POSSÍVEL IDENTIFICAR TODOS OS DADOS");
    } catch (error) {
      console.error("[ficha] falha isolada no processamento", error);
      if (montado.current && processamentoAtual.current === idProcessamento) {
        setPrevisualizando(false);
        setPendencias([
          "Não foi possível processar esta ficha. Confira o conteúdo e tente novamente.",
        ]);
        toast.error("Não foi possível processar esta ficha. Confira o conteúdo e tente novamente.");
      }
    } finally {
      if (montado.current && processamentoAtual.current === idProcessamento) setLendo(false);
    }
  }

  async function lerArquivo(file: File) {
    setLendo(true);
    setAviso("");
    try {
      const ehTexto = file.type.startsWith("text/") || /\.(txt|csv)$/i.test(file.name);
      let payload: { arquivoBase64?: string; mimeType?: string; texto?: string };
      if (ehTexto) {
        payload = { texto: await file.text() };
      } else {
        if (file.size > 5_000_000) throw new Error("Arquivo muito grande. Envie até 5 MB.");
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const leitor = new FileReader();
          leitor.onload = () =>
            typeof leitor.result === "string"
              ? resolve(leitor.result)
              : reject(new Error("Não foi possível ler o arquivo."));
          leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
          leitor.readAsDataURL(file);
        });
        const separador = dataUrl.indexOf(",");
        if (separador < 0) throw new Error("Formato de arquivo inválido.");
        payload = {
          arquivoBase64: dataUrl.slice(separador + 1),
          mimeType: file.type || "image/jpeg",
        };
      }
      const dados = await extrairFicha({ data: payload });
      if (!montado.current) return;
      aplicarDados(dados);
      const faltas = camposFaltantes(dados);
      setPendencias(faltas);
      setPrevisualizando(faltas.length === 0);
      if (faltas.length === 0) toast.success("✓ FICHA PROCESSADA");
      else toast.warning("⚠ NÃO FOI POSSÍVEL IDENTIFICAR TODOS OS DADOS");
    } catch (e) {
      if (montado.current) toast.error((e as Error).message || "Não consegui ler a ficha.");
    } finally {
      if (montado.current) {
        setLendo(false);
        if (inputArquivo.current) inputArquivo.current.value = "";
      }
    }
  }

  async function confirmar() {
    if (nome.trim().length < 3) {
      toast.error("Informe o nome do candidato.");
      return;
    }
    if (soDigitos(cpf).length !== 11) {
      toast.error("Informe um CPF válido.");
      return;
    }
    try {
      const b = await buscarBloqueio(cpf);
      if (b) {
        definirBloqueio(b);
        toast.error("🚫 COLABORADOR BLOQUEADO — não é possível usar este CPF.");
        return;
      }
      const { candidato: c, jaExistia } = await salvar.mutateAsync({
        nome,
        cpf,
        telefone,
        transporte,
        funcao,
        pix_chave: pix,
      });
      setAviso(jaExistia ? "Candidato já cadastrado." : "");
      definirBloqueio(null);
      onCandidato(c);
      setPrevisualizando(false);
      toast.success(jaExistia ? "Usando o cadastro existente." : "Candidato cadastrado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4" translate="no">
      <div className="space-y-2">
        <Label htmlFor="ficha-colada">Cole a ficha aqui</Label>
        <Textarea
          ref={campoFicha}
          id="ficha-colada"
          rows={4}
          placeholder="COLE A FICHA AQUI — o texto ficará no campo até você clicar em Processar ficha."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={lendo} onClick={() => void usarFichaColada()} aria-busy={lendo}>
            {lendo ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ClipboardPaste className="mr-2 h-4 w-4" />
            )}
            <span>{lendo ? "Processando..." : "Processar ficha"}</span>
          </Button>
          <input
            ref={inputArquivo}
            type="file"
            accept="image/*,.pdf,.txt,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void lerArquivo(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={lendo}
            onClick={() => inputArquivo.current?.click()}
          >
            <FileUp className="mr-2 h-4 w-4" />
            Importar arquivo
          </Button>
          <span className="text-xs text-muted-foreground">
            Colar apenas mantém o texto. A leitura começa somente ao clicar em Processar ficha.
          </span>
        </div>
      </div>

      {bloqueio && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-destructive">
            <ShieldAlert className="h-5 w-5" /> 🚫 COLABORADOR BLOQUEADO
          </p>
          <p className="mt-1 text-sm">
            {priv.nome(bloqueio.nome || nome || "Colaborador")} · CPF {priv.cpf(bloqueio.cpf)}
          </p>
          <p className="text-sm text-muted-foreground">
            Motivo: {bloqueio.motivo || "não informado"} · Bloqueado em{" "}
            {new Date(bloqueio.created_at).toLocaleDateString("pt-BR")} por{" "}
            {priv.nome(bloqueio.bloqueado_por_nome || "administrador")}.
          </p>
          <p className="mt-2 text-sm font-semibold">
            Não é possível fechar a vaga, registrar presença ou concluir a programação. Procure o
            responsável pelo sistema para liberação.
          </p>
        </div>
      )}

      {liberado && !bloqueio && soDigitos(cpf).length === 11 && (
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <ShieldCheck className="h-4 w-4" /> ✓ COLABORADOR LIBERADO
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="f-nome">Nome</Label>
          <Input
            id="f-nome"
            value={nome}
            maxLength={160}
            placeholder="TALITAGONCALVESDAROCHA"
            onChange={(e) => setNome(normalizarNomeColaborador(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Padronizado automaticamente: só letras, sem acentos e sem espaços.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-cpf">CPF</Label>
          <Input
            id="f-cpf"
            value={cpf}
            inputMode="numeric"
            onChange={(e) => {
              setCpf(formatarCPF(e.target.value));
              setBloqueio(null);
              setLiberado(false);
              setPrevisualizando(false);
              onBloqueio?.(null);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-tel">Telefone</Label>
          <Input
            id="f-tel"
            value={telefone}
            inputMode="numeric"
            onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-funcao">Função</Label>
          <Select value={funcao || SEM_FUNCAO} onValueChange={(v) => setFuncao(v === SEM_FUNCAO ? "" : v)}>
            <SelectTrigger id="f-funcao">
              <SelectValue placeholder="Selecione a função" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM_FUNCAO}>Sem função definida</SelectItem>
              {opcoesFuncao(funcoes, funcao).map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="f-pix">Chave Pix</Label>
          <Input
            id="f-pix"
            value={pix}
            maxLength={140}
            placeholder="CPF, telefone, e-mail ou chave aleatória"
            onChange={(e) => setPix(e.target.value.slice(0, 140))}
          />
        </div>
      </div>

      {aviso && <p className="text-sm font-medium text-primary">{aviso}</p>}

      {mostrarTransporte && (
        <CamposTransporte valor={transporte} onChange={mudarTransporte} idPrefixo="ficha" />
      )}

      {pendencias.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <ul className="space-y-1 text-sm">
            {pendencias.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">
            O texto colado foi mantido. Complete o campo manualmente ou processe novamente.
          </p>
        </div>
      )}

      {previsualizando && !candidato && (
        <div className="rounded-lg border bg-muted/30 p-4" aria-live="polite">
          <p className="mb-3 font-semibold text-primary">✓ FICHA PROCESSADA</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="font-medium">{priv.nome(nome)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">CPF</dt>
              <dd className="font-medium">{priv.privado ? priv.cpf(cpf) : formatarCPF(cpf)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Telefone</dt>
              <dd className="font-medium">{priv.privado ? priv.telefone(telefone) : formatarTelefone(telefone)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void confirmar()} disabled={salvar.isPending}>
              <UserCheck className="mr-2 h-4 w-4" />
              {salvar.isPending ? "Confirmando..." : "Confirmar cadastro"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("f-nome")?.focus()}
            >
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {candidato && !bloqueio && (
          <>
            <span className="text-sm text-muted-foreground">
              Selecionado: <strong className="text-foreground">{priv.nome(candidato.nome)}</strong> ·{" "}
              {priv.privado ? priv.cpf(candidato.cpf) : formatarCPF(candidato.cpf)}
            </span>
            {mostrarTransporte && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={atualizarTransporte.isPending}
              onClick={() => {
                atualizarTransporte.mutate(
                  { id: candidato.id, ...transporte },
                  {
                    onSuccess: (atualizado) => {
                      onCandidato(atualizado);
                      toast.success("Transporte atualizado.");
                    },
                    onError: (e) => toast.error((e as Error).message),
                  },
                );
              }}
            >
              {atualizarTransporte.isPending ? "Salvando..." : "Salvar transporte"}
            </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
