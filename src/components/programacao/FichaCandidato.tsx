import { useEffect, useRef, useState } from "react";
import { ClipboardPaste, FileUp, Loader2, Search, ShieldAlert, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buscarCandidatoPorCPF,
  formatarCPF,
  formatarTelefone,
  soDigitos,
  useSalvarCandidato,
  type Candidato,
} from "@/lib/programacao";
import { buscarBloqueio, type Bloqueio } from "@/lib/bloqueios";
import { camposFaltantes, interpretarFicha } from "@/lib/ficha-texto";
import { extrairFicha } from "@/lib/ficha.functions";

interface Props {
  onCandidato: (c: Candidato | null) => void;
  candidato: Candidato | null;
  onBloqueio?: (b: Bloqueio | null) => void;
  /** Ao mudar, limpa a ficha para um novo registro. */
  resetSinal?: number;
}

/** Ficha do candidato: cole o texto ou importe o arquivo; usa somente nome, CPF e telefone. */
export function FichaCandidato({ onCandidato, candidato, onBloqueio, resetSinal = 0 }: Props) {
  const inputArquivo = useRef<HTMLInputElement>(null);
  const processamentoAtual = useRef(0);
  const [colado, setColado] = useState("");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [lendo, setLendo] = useState(false);
  const [aviso, setAviso] = useState("");
  const [pendencias, setPendencias] = useState<string[]>([]);
  const [bloqueio, setBloqueio] = useState<Bloqueio | null>(null);
  const [liberado, setLiberado] = useState(false);
  const salvar = useSalvarCandidato();

  useEffect(() => {
    if (!resetSinal) return;
    processamentoAtual.current += 1;
    setColado("");
    setNome("");
    setCpf("");
    setTelefone("");
    setAviso("");
    setPendencias([]);
    setBloqueio(null);
    setLiberado(false);
    setLendo(false);
    if (inputArquivo.current) inputArquivo.current.value = "";
  }, [resetSinal]);

  function definirBloqueio(b: Bloqueio | null) {
    setBloqueio(b);
    setLiberado(!b);
    onBloqueio?.(b);
    if (b) onCandidato(null);
  }

  /** Consulta bloqueio e cadastro existente a partir do CPF. */
  async function conferirCPF(valorCpf: string, preencher = true) {
    const limpo = soDigitos(valorCpf);
    if (limpo.length !== 11) return null;
    try {
      const b = await buscarBloqueio(limpo);
      definirBloqueio(b);
      if (b) {
        toast.error("🚫 COLABORADOR BLOQUEADO");
        return null;
      }
      const existente = await buscarCandidatoPorCPF(limpo);
      if (existente) {
        setAviso("Candidato já cadastrado.");
        if (preencher) {
          setNome(existente.nome);
          setTelefone(formatarTelefone(existente.telefone ?? ""));
        }
        onCandidato(existente);
      } else {
        setAviso("");
      }
      return existente;
    } catch (error) {
      console.error("[ficha] falha ao consultar CPF", error);
      setBloqueio(null);
      setLiberado(false);
      onBloqueio?.(null);
      setAviso("Não foi possível consultar o CPF agora. A ficha foi mantida para tentar novamente.");
      toast.error("Não foi possível consultar o CPF. Tente novamente.");
      return null;
    }
  }

  function aplicarDados(dados: { nome: string; cpf: string; telefone: string }) {
    if (dados.nome) setNome(dados.nome);
    if (dados.cpf) setCpf(formatarCPF(dados.cpf));
    if (dados.telefone) setTelefone(formatarTelefone(dados.telefone));
  }

  async function usarFichaColada(textoBruto?: string) {
    const idProcessamento = processamentoAtual.current + 1;
    processamentoAtual.current = idProcessamento;
    const original = typeof textoBruto === "string" ? textoBruto : colado;
    if (typeof original !== "string") return;
    const texto = original.slice(0, 100_000).trim();
    setColado(original);
    if (texto.length < 5) {
      setPendencias(["Não foi possível identificar os dados necessários nesta ficha."]);
      toast.error("Não foi possível processar esta ficha. Confira o conteúdo e tente novamente.");
      return;
    }
    setLendo(true);
    setPendencias([]);
    try {
      let dados = interpretarFicha(texto);
      if (!dados.cpf || !dados.nome || !dados.telefone) {
        try {
          const ia = await extrairFicha({ data: { texto: texto.slice(0, 20_000) } });
          if (processamentoAtual.current !== idProcessamento) return;
          dados = {
            nome: dados.nome || ia.nome,
            cpf: dados.cpf || ia.cpf,
            telefone: dados.telefone || ia.telefone,
          };
        } catch {
          /* mantém a leitura local */
        }
      }
      if (processamentoAtual.current !== idProcessamento) return;
      aplicarDados(dados);
      const faltas = camposFaltantes(dados);
      setPendencias(faltas);
      if (dados.cpf) await conferirCPF(dados.cpf);
      if (processamentoAtual.current !== idProcessamento) return;
      if (faltas.length === 0) toast.success("Ficha lida. Confira os dados.");
      else toast.warning(faltas[0] ?? "Não foi possível identificar os dados necessários.");
    } catch (error) {
      console.error("[ficha] falha isolada no processamento", error);
      if (processamentoAtual.current === idProcessamento) {
        setPendencias(["Não foi possível processar esta ficha. Confira o conteúdo e tente novamente."]);
        toast.error("Não foi possível processar esta ficha. Confira o conteúdo e tente novamente.");
      }
    } finally {
      if (processamentoAtual.current === idProcessamento) setLendo(false);
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
        const buffer = new Uint8Array(await file.arrayBuffer());
        let binario = "";
        for (const b of buffer) binario += String.fromCharCode(b);
        payload = { arquivoBase64: btoa(binario), mimeType: file.type || "image/jpeg" };
      }
      const dados = await extrairFicha({ data: payload });
      aplicarDados(dados);
      if (dados.cpf) await conferirCPF(dados.cpf);
      toast.success("Ficha lida. Confira os dados.");
    } catch (e) {
      toast.error((e as Error).message || "Não consegui ler a ficha.");
    } finally {
      setLendo(false);
      if (inputArquivo.current) inputArquivo.current.value = "";
    }
  }

  async function verificarCPF() {
    if (soDigitos(cpf).length !== 11) {
      toast.error("Informe um CPF completo.");
      return;
    }
    const existente = await conferirCPF(cpf);
    if (!bloqueio && !existente) toast.info("CPF liberado e ainda não cadastrado.");
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
    const b = await buscarBloqueio(cpf);
    if (b) {
      definirBloqueio(b);
      toast.error("🚫 COLABORADOR BLOQUEADO — não é possível usar este CPF.");
      return;
    }
    try {
      const { candidato: c, jaExistia } = await salvar.mutateAsync({ nome, cpf, telefone });
      setAviso(jaExistia ? "Candidato já cadastrado." : "");
      definirBloqueio(null);
      onCandidato(c);
      toast.success(jaExistia ? "Usando o cadastro existente." : "Candidato cadastrado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ficha-colada">Cole a ficha aqui</Label>
        <Textarea
          id="ficha-colada"
          rows={4}
          placeholder="COLE A FICHA AQUI — o sistema identifica sozinho nome, CPF e telefone."
          value={colado}
          onChange={(e) => setColado(e.target.value)}
          onPaste={(e) => {
            try {
              const campo = e.currentTarget;
              const texto = e.clipboardData?.getData("text/plain");
              if (typeof texto === "string" && texto.length > 0) {
                e.preventDefault();
                setColado(texto);
                window.setTimeout(() => void usarFichaColada(texto), 0);
                return;
              }
              // Guarda o elemento agora: alguns navegadores invalidam o evento após a colagem.
              window.setTimeout(() => {
                const valor = campo.value ?? "";
                setColado(valor);
                void usarFichaColada(valor);
              }, 60);
            } catch (error) {
              console.error("[ficha] falha ao receber conteúdo colado", error);
              setPendencias(["Não foi possível processar esta ficha. Confira o conteúdo e tente novamente."]);
              toast.error("Não foi possível processar esta ficha. Confira o conteúdo e tente novamente.");
            }
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={lendo} onClick={() => void usarFichaColada()}>
            {lendo ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ClipboardPaste className="mr-2 h-4 w-4" />
            )}
            {lendo ? "Lendo ficha..." : pendencias.length ? "Tentar novamente" : "Ler ficha colada"}
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
            Somente nome, CPF e telefone são aproveitados — o restante é descartado.
          </span>
        </div>
      </div>

      {bloqueio && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-destructive">
            <ShieldAlert className="h-5 w-5" /> 🚫 COLABORADOR BLOQUEADO
          </p>
          <p className="mt-1 text-sm">
            {bloqueio.nome || nome || "Colaborador"} · CPF {formatarCPF(bloqueio.cpf)}
          </p>
          <p className="text-sm text-muted-foreground">
            Motivo: {bloqueio.motivo || "não informado"} · Bloqueado em{" "}
            {new Date(bloqueio.created_at).toLocaleDateString("pt-BR")} por{" "}
            {bloqueio.bloqueado_por_nome || "administrador"}.
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
          <Input id="f-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-cpf">CPF</Label>
          <div className="flex gap-2">
            <Input
              id="f-cpf"
              value={cpf}
              inputMode="numeric"
              onChange={(e) => {
                setCpf(formatarCPF(e.target.value));
                setBloqueio(null);
                setLiberado(false);
                onBloqueio?.(null);
              }}
              onBlur={() => void conferirCPF(cpf)}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => void verificarCPF()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
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
      </div>

      {aviso && <p className="text-sm font-medium text-primary">{aviso}</p>}

      {pendencias.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <ul className="space-y-1 text-sm">
            {pendencias.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">
            O texto colado foi mantido. Complete o campo manualmente ou toque em “Tentar novamente”.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => void confirmar()}
          disabled={salvar.isPending || Boolean(bloqueio)}
        >
          <UserCheck className="mr-2 h-4 w-4" />
          {salvar.isPending ? "Salvando..." : "Usar este candidato"}
        </Button>
        {candidato && !bloqueio && (
          <span className="text-sm text-muted-foreground">
            Selecionado: <strong className="text-foreground">{candidato.nome}</strong> ·{" "}
            {formatarCPF(candidato.cpf)}
          </span>
        )}
      </div>
    </div>
  );
}
