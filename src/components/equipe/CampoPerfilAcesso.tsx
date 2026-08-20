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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCriarPerfil, usePerfisAcesso } from "@/lib/perfis";

interface Props {
  /** Perfil de acesso vinculado ao colaborador (id) ou null. */
  value: string | null;
  onChange: (perfilId: string | null) => void;
  id?: string;
  className?: string;
  /** Exibe o botão "+ Cadastrar perfil" ao lado do campo. */
  podeCriar?: boolean;
}

/**
 * Seleção do perfil de acesso do colaborador do Recruta+.
 * Lista apenas os perfis criados pelo administrador em Perfis e Permissões
 * (nada pré-cadastrado) e permite criar um novo perfil na hora.
 */
export function CampoPerfilAcesso({ value, onChange, id, className, podeCriar = true }: Props) {
  const { data: perfis = [] } = usePerfisAcesso();
  const criar = useCriarPerfil();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const criados = perfis.filter((p) => !p.sistema);
  const atual = criados.find((p) => p.id === value);
  const opcoes = criados.filter((p) => p.ativo || p.id === value);

  async function cadastrar() {
    try {
      const novoId = await criar.mutateAsync({ nome, descricao });
      onChange(novoId);
      setNome("");
      setDescricao("");
      setAberto(false);
      toast.success("Perfil criado. Configure os acessos em Perfis e Permissões.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="flex w-full items-end gap-2">
      <Select value={value ?? "nenhum"} onValueChange={(v) => onChange(v === "nenhum" ? null : v)}>
        <SelectTrigger id={id} className={cn("h-9 min-w-0 flex-1", className)}>
          <SelectValue placeholder="Selecione o perfil">
            {atual ? `${atual.nome}${atual.ativo ? "" : " (inativo)"}` : "Sem perfil"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="nenhum">Sem perfil</SelectItem>
          {opcoes.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.nome}
              {p.ativo ? "" : " (inativo)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {podeCriar && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            title="Cadastrar perfil"
            aria-label="Cadastrar perfil de acesso"
            onClick={() => setAberto(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Dialog open={aberto} onOpenChange={setAberto}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Cadastrar perfil</DialogTitle>
                <DialogDescription>
                  Ex.: Atendimento, Financeiro, Faturamento, Coordenação, Programação, RH. O perfil
                  fica disponível em Perfis e Permissões para configurar os acessos.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cp-nome">Nome do perfil</Label>
                  <Input
                    id="cp-nome"
                    value={nome}
                    maxLength={80}
                    placeholder="Ex.: Atendimento"
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cp-desc">Descrição (opcional)</Label>
                  <Textarea
                    id="cp-desc"
                    value={descricao}
                    maxLength={200}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => void cadastrar()}
                  disabled={criar.isPending || nome.trim().length < 2}
                >
                  Cadastrar perfil
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
