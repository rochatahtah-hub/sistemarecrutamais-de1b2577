import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { FichaCandidato } from "@/components/programacao/FichaCandidato";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarCPF, formatarTelefone, useCandidatos, type Candidato } from "@/lib/programacao";

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
  const { data: lista = [] } = useCandidatos(busca);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Cadastrar candidato</h1>
        <p className="text-sm text-muted-foreground">
          Da ficha o sistema guarda somente nome, CPF e telefone. As demais informações são
          descartadas após a leitura.
        </p>
      </div>

      <div className="surface-panel rounded-xl p-4">
        <FichaCandidato candidato={candidato} onCandidato={setCandidato} />
        {candidato && (
          <div className="mt-4">
            <Button asChild>
              <Link to="/minha-programacao">Ir para a programação</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="surface-panel rounded-xl p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Candidatos cadastrados</h2>
          <Input
            placeholder="Buscar por nome ou CPF"
            className="max-w-xs"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{formatarCPF(c.cpf)}</TableCell>
                  <TableCell>{c.telefone ? formatarTelefone(c.telefone) : "—"}</TableCell>
                </TableRow>
              ))}
              {lista.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    Nenhum candidato encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
