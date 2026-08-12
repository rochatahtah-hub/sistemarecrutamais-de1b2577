import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCargosCLT, useSalvarCargoCLT } from "@/lib/rs";

interface Props {
  value: string;
  onChange: (cargo: string) => void;
  podeCadastrar?: boolean;
}

/** Seleção de cargo a partir dos cargos cadastrados, com opção de cadastrar um novo. */
export function CampoCargoRS({ value, onChange, podeCadastrar = true }: Props) {
  const { data: cargos = [] } = useCargosCLT();
  const salvar = useSalvarCargoCLT();
  const [aberto, setAberto] = useState(false);
  const [novo, setNovo] = useState("");

  const nomes = cargos.filter((c) => c.ativo).map((c) => c.nome);
  const opcoes = value && !nomes.includes(value) ? [value, ...nomes] : nomes;

  async function cadastrar() {
    try {
      const nome = await salvar.mutateAsync({ nome: novo });
      onChange(nome);
      setNovo("");
      setAberto(false);
      toast.success("Cargo cadastrado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível cadastrar o cargo.");
    }
  }

  return (
    <div className="grid gap-1.5">
      <Label>Cargo</Label>
      <div className="flex gap-2">
        <Select value={value || "nenhum"} onValueChange={(v) => onChange(v === "nenhum" ? "" : v)}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecione o cargo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nenhum">Sem cargo</SelectItem>
            {opcoes.map((n) => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {podeCadastrar && (
          <Button type="button" variant="outline" size="icon" title="Cadastrar cargo" onClick={() => setAberto(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar cargo</DialogTitle>
            <DialogDescription>O cargo ficará disponível para todos os candidatos CLT.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="rs-novo-cargo">Nome do cargo</Label>
            <Input
              id="rs-novo-cargo"
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              placeholder="Ex.: Auxiliar de Produção"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={() => void cadastrar()} disabled={!novo.trim() || salvar.isPending}>
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
