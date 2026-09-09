import { useState } from "react";
import { CheckCircle2, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { candidatarPublico } from "@/lib/captacao.functions";
import { cpfValido, formatarCpf, formatarTelefone, soDigitosTelefone } from "@/lib/diarias";

export interface OportunidadePublica {
  id: string;
  modalidade: "especifica" | "clt";
  titulo: string;
  data_oportunidade: string | null;
  descricao: string;
  requisitos: string;
  informacoes_adicionais: string;
  curriculo_obrigatorio: boolean;
}

const TIPOS = ["application/pdf", "image/jpeg", "image/png"];

async function lerArquivo(arquivo: File) {
  const buffer = await arquivo.arrayBuffer();
  let binario = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) binario += String.fromCharCode(bytes[i]!);
  return btoa(binario);
}

/** Formulário de candidatura em uma oportunidade específica ou vaga CLT. */
export function CandidaturaOportunidade({
  slug,
  oportunidade,
  onVoltar,
}: {
  slug: string;
  oportunidade: OportunidadePublica;
  onVoltar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const valido =
    nome.trim().length >= 3 &&
    soDigitosTelefone(telefone).length >= 10 &&
    cpfValido(cpf) &&
    cidade.trim().length >= 2 &&
    (!oportunidade.curriculo_obrigatorio || Boolean(arquivo));

  async function enviar() {
    if (!valido || enviando) return;
    setEnviando(true);
    try {
      let curriculo: { nome: string; tipo: string; base64: string } | null = null;
      if (arquivo) {
        if (!TIPOS.includes(arquivo.type)) throw new Error("Envie o currículo em PDF, JPG ou PNG.");
        if (arquivo.size > 8 * 1024 * 1024) throw new Error("O currículo deve ter até 8 MB.");
        curriculo = { nome: arquivo.name, tipo: arquivo.type, base64: await lerArquivo(arquivo) };
      }
      const retorno = await candidatarPublico({
        data: {
          slug,
          oportunidadeId: oportunidade.id,
          nome: nome.trim(),
          telefone,
          cpf,
          cidade: cidade.trim(),
          bairro: bairro.trim(),
          curriculo,
        },
      });
      setConcluido(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar sua candidatura.");
    } finally {
      setEnviando(false);
    }
  }

  if (concluido) {
    return (
      <Card className="border-[color-mix(in_oklab,var(--color-gold)_26%,transparent)] bg-[color-mix(in_oklab,var(--color-sidebar)_45%,transparent)] text-sidebar-foreground shadow-none backdrop-blur-md">
        <CardHeader className="items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-gold/25 bg-gold-soft text-accent-foreground">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <CardTitle>Candidatura enviada!</CardTitle>
          <CardDescription className="text-sidebar-foreground/65">
            Recebemos seu cadastro para <strong>{oportunidade.titulo}</strong>. Nossa equipe entrará em
            contato se o seu perfil for compatível.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button variant="outline" className="h-11" onClick={onVoltar}>
            Ver outras oportunidades
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[color-mix(in_oklab,var(--color-gold)_26%,transparent)] bg-[color-mix(in_oklab,var(--color-sidebar)_45%,transparent)] text-sidebar-foreground shadow-none backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-lg leading-snug">{oportunidade.titulo}</CardTitle>
        <CardDescription className="text-sidebar-foreground/65">
          {oportunidade.data_oportunidade
            ? new Date(`${oportunidade.data_oportunidade}T12:00:00`).toLocaleDateString("pt-BR")
            : "Vaga efetiva"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {oportunidade.requisitos && (
          <div className="rounded-xl border border-sidebar-border/60 p-3.5">
            <p className="mb-1 text-xs font-semibold uppercase text-sidebar-foreground/70">Requisitos</p>
            <p className="whitespace-pre-line text-sm text-sidebar-foreground/80">
              {oportunidade.requisitos}
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-nome">Nome completo *</Label>
            <Input id="c-nome" value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-tel">Telefone / WhatsApp *</Label>
            <Input
              id="c-tel"
              inputMode="tel"
              value={formatarTelefone(telefone)}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-cpf">CPF *</Label>
            <Input
              id="c-cpf"
              inputMode="numeric"
              value={formatarCpf(cpf)}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
            />
            {cpf.length > 0 && !cpfValido(cpf) && (
              <p className="text-xs text-destructive">Informe um CPF válido.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-cidade">Cidade *</Label>
            <Input id="c-cidade" value={cidade} maxLength={80} onChange={(e) => setCidade(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="c-bairro">Bairro</Label>
            <Input id="c-bairro" value={bairro} maxLength={80} onChange={(e) => setBairro(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-cv">
            Currículo {oportunidade.curriculo_obrigatorio ? "*" : "(opcional)"}
          </Label>
          <label
            htmlFor="c-cv"
            className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-sidebar-border/60 px-3.5 py-3 text-sm text-sidebar-foreground/70"
          >
            <Paperclip className="h-4 w-4 shrink-0" />
            <span className="truncate">{arquivo ? arquivo.name : "Anexar currículo (PDF, JPG ou PNG)"}</span>
          </label>
          <input
            id="c-cv"
            type="file"
            className="sr-only"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="h-12 sm:w-auto" onClick={onVoltar}>
            Voltar
          </Button>
          <Button className="h-12 flex-1" disabled={!valido || enviando} onClick={enviar}>
            {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar candidatura
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
