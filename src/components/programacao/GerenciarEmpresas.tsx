import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmpresas, useSalvarEmpresa } from "@/lib/programacao";

/** Cadastro e manutenção das empresas parceiras (visível para o admin). */
export function GerenciarEmpresas() {
  const { data: empresas = [] } = useEmpresas();
  const salvar = useSalvarEmpresa();
  const [nome, setNome] = useState("");

  const adicionar = () => {
    if (nome.trim().length < 2) {
      toast.error("Informe o nome da empresa.");
      return;
    }
    salvar.mutate(
      { nome: nome.trim() },
      {
        onSuccess: () => {
          setNome("");
          toast.success("Empresa cadastrada.");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao cadastrar."),
      },
    );
  };

  return (
    <div className="surface-panel space-y-4 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Gerenciar empresas</h2>
      </div>
      <div className="flex gap-2">
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da empresa"
          onKeyDown={(e) => {
            if (e.key === "Enter") adicionar();
          }}
        />
        <Button onClick={adicionar} disabled={salvar.isPending}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar
        </Button>
      </div>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead className="w-28 text-right">Ativa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">{e.nome}</TableCell>
              <TableCell className="text-right">
                <Switch
                  checked={e.ativo}
                  onCheckedChange={(v) => salvar.mutate({ id: e.id, nome: e.nome, ativo: v })}
                />
              </TableCell>
            </TableRow>
          ))}
          {empresas.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                Nenhuma empresa cadastrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
