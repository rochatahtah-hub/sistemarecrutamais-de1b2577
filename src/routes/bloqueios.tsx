import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { RequerAdmin } from "@/components/RequerAdmin";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Search, ShieldAlert, ShieldOff, Unlock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { formatarCPF } from "@/lib/programacao";
import { usePrivacidade } from "@/lib/privacidade";
import {
  useBloqueados,
  useBloquearColaborador,
  useDesbloquearColaborador,
} from "@/lib/bloqueios";
import { alterarPin } from "@/lib/pin.functions";

export const Route = createFileRoute("/bloqueios")({
  head: () => ({
    meta: [
      { title: "Bloqueio de Colaboradores | Sistema de Vagas" },
      {
        name: "description",
        content: "Área administrativa para bloquear e desbloquear colaboradores por CPF.",
      },
      { property: "og:title", content: "Bloqueio de Colaboradores | Sistema de Vagas" },
      {
        property: "og:description",
        content: "Área administrativa para bloquear e desbloquear colaboradores por CPF.",
      },
    ],
  }),
  component: PaginaProtegida,
});

function Pagina() {
  const { isAdmin } = useAuth();
  const priv = usePrivacidade();
  const [busca, setBusca] = useState("");
  const { data: lista = [], isLoading } = useBloqueados(busca);
  const bloquear = useBloquearColaborador();
  const desbloquear = useDesbloquearColaborador();
  const trocarPin = useServerFn(alterarPin);

  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [motivo, setMotivo] = useState("");
  const [novoPin, setNovoPin] = useState("");

  async function confirmarBloqueio() {
    try {
      await bloquear.mutateAsync({ cpf, nome, motivo });
      toast.success("Colaborador bloqueado.");
      setCpf("");
      setNome("");
      setMotivo("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function salvarPin() {
    try {
      await trocarPin({ data: { novo: novoPin } });
      setNovoPin("");
      toast.success("PIN administrativo atualizado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!isAdmin) {
    return (
      <div className="surface-panel rounded-xl p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-3 font-display text-xl font-bold">Área administrativa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Entre pelo botão 🔐 ADMINISTRADOR com o PIN para acessar o bloqueio de colaboradores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Bloqueio de colaboradores</h1>
        <p className="text-sm text-muted-foreground">
          O CPF é o identificador principal: alterar nome ou telefone não contorna o bloqueio.
        </p>
      </div>

      <div className="surface-panel space-y-4 rounded-xl p-4">
        <h2 className="font-display text-lg font-semibold">Bloquear colaborador</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="b-cpf">CPF</Label>
            <Input
              id="b-cpf"
              inputMode="numeric"
              value={cpf}
              onChange={(e) => setCpf(formatarCPF(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-nome">Nome (opcional)</Label>
            <Input id="b-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-1">
            <Label htmlFor="b-motivo">Motivo do bloqueio</Label>
            <Textarea
              id="b-motivo"
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={() => void confirmarBloqueio()} disabled={bloquear.isPending}>
          <ShieldOff className="mr-2 h-4 w-4" />
          {bloquear.isPending ? "Bloqueando..." : "Bloquear colaborador"}
        </Button>
      </div>

      <div className="surface-panel space-y-3 rounded-xl p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
          <h2 className="font-display text-lg font-semibold">Lista de bloqueados</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="w-full pl-8 sm:w-64"
              placeholder="Pesquisar por CPF ou nome"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CPF</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Bloqueado por</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    {priv.privado ? priv.cpf(b.cpf) : formatarCPF(b.cpf)}
                  </TableCell>
                  <TableCell>{b.nome ? priv.nome(b.nome) : "—"}</TableCell>
                  <TableCell>{priv.privado ? priv.texto(b.motivo) : (b.motivo || "—")}</TableCell>
                  <TableCell>{new Date(b.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{b.bloqueado_por_nome ? priv.nome(b.bloqueado_por_nome) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => desbloquear.mutate(b.id)}
                      disabled={desbloquear.isPending}
                    >
                      <Unlock className="mr-2 h-4 w-4" />
                      Desbloquear
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && lista.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhum colaborador bloqueado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="surface-panel space-y-3 rounded-xl p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <KeyRound className="h-4 w-4 text-primary" /> PIN administrativo
        </h2>
        <p className="text-sm text-muted-foreground">
          O PIN fica guardado de forma cifrada e nunca é exibido. Após 5 tentativas incorretas o
          acesso fica bloqueado por 15 minutos.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="novo-pin">Novo PIN (4 a 8 dígitos)</Label>
            <Input
              id="novo-pin"
              type="password"
              inputMode="numeric"
              maxLength={8}
              className="w-48"
              value={novoPin}
              onChange={(e) => setNovoPin(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button variant="outline" disabled={novoPin.length < 4} onClick={() => void salvarPin()}>
            Alterar PIN
          </Button>
        </div>
      </div>
    </div>
  );
}

function PaginaProtegida() {
  return (
    <RequerAdmin area="Bloqueios">
      <Pagina />
    </RequerAdmin>
  );
}
