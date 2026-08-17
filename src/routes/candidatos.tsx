import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { FichaCandidato } from "@/components/programacao/FichaCandidato";
import { CamposTransporte } from "@/components/programacao/CamposTransporte";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatarCPF,
  formatarTelefone,
  rotuloTransporte,
  useAtualizarTransporte,
  useCandidatos,
  TRANSPORTE_PADRAO,
  type Candidato,
  type DadosTransporte,
} from "@/lib/programacao";
import { usePrivacidade } from "@/lib/privacidade";
import { useDebounce } from "@/hooks/use-debounce";

export const Route = createFileRoute("/candidatos")({
  head: () => ({
    meta: [
      { title: "Cadastrar Candidato | Sistema de Vagas" },
      {
        name: "description",
        content: "Importe a ficha do candidato e cadastre apenas nome, CPF e telefone.",
      },
      { property: "og:title", content: "Cadastrar Candidato | Sistema de Vagas" },
      {
        property: "og:description",
        content: "Importe a ficha do candidato e cadastre apenas nome, CPF e telefone.",
      },
    ],
  }),
  component: Pagina,
});

function Pagina() {
  const [busca, setBusca] = useState("");
  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const buscaDebounced = useDebounce(busca, 350);
  const { data: lista = [] } = useCandidatos(buscaDebounced);
  const priv = usePrivacidade();
  const [editando, setEditando] = useState<Candidato | null>(null);
  const [transporte, setTransporte] = useState<DadosTransporte>(TRANSPORTE_PADRAO);
  const atualizar = useAtualizarTransporte();

  function abrirEdicao(c: Candidato) {
    setEditando(c);
    setTransporte({
      transporte_proprio: c.transporte_proprio ?? false,
      transporte_tipos: c.transporte_tipos ?? [],
      precisa_fretado: c.precisa_fretado ?? false,
      transporte_observacao: c.transporte_observacao ?? "",
    });
  }

  function salvarTransporte() {
    if (!editando) return;
    atualizar.mutate(
      { id: editando.id, ...transporte },
      {
        onSuccess: (atualizado) => {
          if (candidato?.id === atualizado.id) setCandidato(atualizado);
          setEditando(null);
          toast.success("Transporte atualizado.");
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  function resumoTransporte(c: Candidato) {
    const partes: string[] = [];
    if (c.transporte_proprio) {
      const tipos = (c.transporte_tipos ?? []).map(rotuloTransporte).join(", ");
      partes.push(tipos ? `Próprio: ${tipos}` : "Transporte próprio");
    }
    if (c.precisa_fretado) partes.push("Precisa de fretado");
    if (!partes.length) partes.push("Sem transporte próprio");
    return partes.join(" · ");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Cadastrar candidato</h1>
        <p className="text-sm text-muted-foreground">
          Da ficha o sistema guarda somente nome, CPF e telefone. As demais informações são
          descartadas após a leitura.
        </p>
      </div>

      <div className="surface-panel rounded-2xl p-4">
        <FichaCandidato candidato={candidato} onCandidato={setCandidato} />
        {candidato && (
          <div className="mt-4">
            <Button asChild>
              <Link to="/minha-programacao">Ir para a programação</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="surface-panel rounded-2xl p-4">
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
          <h2 className="font-display text-lg font-semibold">Candidatos cadastrados</h2>
          <Input
            placeholder="Buscar por nome ou CPF"
            className="w-full sm:max-w-xs"
            value={busca}
            maxLength={80}
            onChange={(e) => setBusca(e.target.value.slice(0, 80))}
          />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Transporte</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{priv.nome(c.nome)}</TableCell>
                  <TableCell>{priv.privado ? priv.cpf(c.cpf) : formatarCPF(c.cpf)}</TableCell>
                  <TableCell>
                    {c.telefone
                      ? priv.privado
                        ? priv.telefone(c.telefone)
                        : formatarTelefone(c.telefone)
                      : "—"}
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <span className="text-sm">{resumoTransporte(c)}</span>
                    {c.transporte_observacao ? (
                      <span className="block text-xs text-muted-foreground">
                        {c.transporte_observacao}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => abrirEdicao(c)}>
                      Editar transporte
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {lista.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhum candidato encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!editando} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Transporte e deslocamento</DialogTitle>
            <DialogDescription>
              {editando ? priv.nome(editando.nome) : ""}
            </DialogDescription>
          </DialogHeader>
          <CamposTransporte
            valor={transporte}
            onChange={(parcial) => setTransporte((atual) => ({ ...atual, ...parcial }))}
            idPrefixo="edicao"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button type="button" disabled={atualizar.isPending} onClick={salvarTransporte}>
              {atualizar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </div>
  );
}
