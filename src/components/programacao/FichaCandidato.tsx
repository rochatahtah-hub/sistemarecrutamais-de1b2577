import { useRef, useState } from "react";
import { FileUp, Loader2, Search, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buscarCandidatoPorCPF,
  formatarCPF,
  formatarTelefone,
  soDigitos,
  useSalvarCandidato,
  type Candidato,
} from "@/lib/programacao";
import { extrairFicha } from "@/lib/ficha.functions";

interface Props {
  onCandidato: (c: Candidato) => void;
  candidato: Candidato | null;
}

/** Ficha do candidato: importa o arquivo e extrai somente nome, CPF e telefone. */
export function FichaCandidato({ onCandidato, candidato }: Props) {
  const inputArquivo = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [lendo, setLendo] = useState(false);
  const [aviso, setAviso] = useState("");
  const salvar = useSalvarCandidato();

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
      if (dados.nome) setNome(dados.nome);
      if (dados.cpf) setCpf(formatarCPF(dados.cpf));
      if (dados.telefone) setTelefone(formatarTelefone(dados.telefone));
      if (dados.cpf) {
        const existente = await buscarCandidatoPorCPF(dados.cpf);
        if (existente) {
          setAviso("Candidato já cadastrado.");
          onCandidato(existente);
          setNome(existente.nome);
          setTelefone(formatarTelefone(existente.telefone ?? ""));
        }
      }
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
    const existente = await buscarCandidatoPorCPF(cpf);
    if (!existente) {
      setAviso("");
      toast.info("CPF ainda não cadastrado.");
      return;
    }
    setAviso("Candidato já cadastrado.");
    setNome(existente.nome);
    setTelefone(formatarTelefone(existente.telefone ?? ""));
    onCandidato(existente);
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
      const { candidato: c, jaExistia } = await salvar.mutateAsync({ nome, cpf, telefone });
      setAviso(jaExistia ? "Candidato já cadastrado." : "");
      onCandidato(c);
      toast.success(jaExistia ? "Usando o cadastro existente." : "Candidato cadastrado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
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
          {lendo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
          {lendo ? "Lendo ficha..." : "Importar ficha"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Do arquivo o sistema usa somente nome, CPF e telefone — o restante é descartado.
        </span>
      </div>

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
              onChange={(e) => setCpf(formatarCPF(e.target.value))}
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

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void confirmar()} disabled={salvar.isPending}>
          <UserCheck className="mr-2 h-4 w-4" />
          {salvar.isPending ? "Salvando..." : "Usar este candidato"}
        </Button>
        {candidato && (
          <span className="text-sm text-muted-foreground">
            Selecionado: <strong className="text-foreground">{candidato.nome}</strong> ·{" "}
            {formatarCPF(candidato.cpf)}
          </span>
        )}
      </div>
    </div>
  );
}
