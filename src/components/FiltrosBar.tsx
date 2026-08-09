import { Eraser, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFiltros } from "@/lib/filtros";
import type { VagaRegistro } from "@/lib/tipos";

const MESES = [
  ["01", "Janeiro"],
  ["02", "Fevereiro"],
  ["03", "Março"],
  ["04", "Abril"],
  ["05", "Maio"],
  ["06", "Junho"],
  ["07", "Julho"],
  ["08", "Agosto"],
  ["09", "Setembro"],
  ["10", "Outubro"],
  ["11", "Novembro"],
  ["12", "Dezembro"],
] as const;

export function FiltrosBar({ registros }: { registros: VagaRegistro[] }) {
  const { filtros, setFiltros, limpar } = useFiltros();

  const colaboradores = Array.from(new Set(registros.map((r) => r.colaborador))).sort();
  const empresas = Array.from(new Set(registros.map((r) => r.empresa))).sort();
  const anos = Array.from(new Set(registros.map((r) => r.data.slice(0, 4)))).sort().reverse();

  return (
    <div className="surface-panel rounded-xl p-3 md:p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <div className="col-span-2 md:col-span-2 xl:col-span-2">
          <Label className="mb-1.5 block text-xs text-muted-foreground">Pesquisar</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={filtros.busca}
              onChange={(e) => setFiltros({ busca: e.target.value })}
              placeholder="Colaborador, empresa ou vaga"
              className="pl-8"
            />
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Data inicial</Label>
          <Input
            type="date"
            value={filtros.dataInicio}
            onChange={(e) => setFiltros({ dataInicio: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Data final</Label>
          <Input
            type="date"
            value={filtros.dataFim}
            onChange={(e) => setFiltros({ dataFim: e.target.value })}
          />
        </div>

        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Mês</Label>
          <Select value={filtros.mes} onValueChange={(v) => setFiltros({ mes: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {MESES.map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Ano</Label>
          <Select value={filtros.ano} onValueChange={(v) => setFiltros({ ano: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {anos.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Quinzena</Label>
          <Select
            value={filtros.quinzena}
            onValueChange={(v) => setFiltros({ quinzena: v as "todas" | "1" | "2" })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="1">1ª (dias 1–15)</SelectItem>
              <SelectItem value="2">2ª (dia 16 ao fim)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Status</Label>
          <Select value={filtros.status} onValueChange={(v) => setFiltros({ status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="AGUARDANDO">Aguardando confirmação</SelectItem>
              <SelectItem value="PRESENCA">Presença</SelectItem>
              <SelectItem value="FALTA">Falta</SelectItem>
              <SelectItem value="CANCELAMENTO">Cancelamento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 md:col-span-1">
          <Label className="mb-1.5 block text-xs text-muted-foreground">Colaborador</Label>
          <Select value={filtros.colaborador} onValueChange={(v) => setFiltros({ colaborador: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {colaboradores.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 md:col-span-1">
          <Label className="mb-1.5 block text-xs text-muted-foreground">Empresa</Label>
          <Select value={filtros.empresa} onValueChange={(v) => setFiltros({ empresa: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 flex items-end md:col-span-1">
          <Button variant="outline" className="w-full" onClick={limpar}>
            <Eraser className="mr-2 h-4 w-4" /> Limpar filtros
          </Button>
        </div>
      </div>
    </div>
  );
}