import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useConfiguracoes, useSalvarConfiguracao } from "@/lib/dados";
import {
  MAPEAMENTO_PADRAO,
  METAS_PADRAO,
  type MapeamentoStatus,
  type Metas,
} from "@/lib/tipos";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | Gestão de Vagas" },
      {
        name: "description",
        content: "Defina metas de presença, falta e cancelamento e o mapeamento de status.",
      },
      { property: "og:title", content: "Configurações | Gestão de Vagas" },
      {
        property: "og:description",
        content: "Defina metas de presença, falta e cancelamento e o mapeamento de status.",
      },
    ],
  }),
  component: Pagina,
});

const GRUPOS: { chave: keyof MapeamentoStatus; titulo: string; ajuda: string }[] = [
  { chave: "PRESENCA", titulo: "Presença", ajuda: "Ex.: presente, compareceu, ok" },
  { chave: "FALTA", titulo: "Falta", ajuda: "Ex.: faltou, ausente, no show" },
  { chave: "CANCELAMENTO", titulo: "Cancelamento", ajuda: "Ex.: cancelado, desistiu" },
];

function Pagina() {
  const { data: config } = useConfiguracoes();
  const salvar = useSalvarConfiguracao();

  const [metas, setMetas] = useState<Metas>(METAS_PADRAO);
  const [mapeamento, setMapeamento] = useState<MapeamentoStatus>(MAPEAMENTO_PADRAO);

  useEffect(() => {
    if (config) {
      setMetas(config.metas);
      setMapeamento(config.mapeamento);
    }
  }, [config]);

  async function salvarMetas() {
    try {
      await salvar.mutateAsync({ chave: "metas", valor: metas });
      toast.success("Metas atualizadas.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function salvarMapeamento() {
    try {
      await salvar.mutateAsync({ chave: "mapeamento_status", valor: mapeamento });
      toast.success("Mapeamento de status atualizado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Metas e regras usadas nos alertas e na interpretação das planilhas.
        </p>
      </div>

      <div className="surface-panel space-y-4 rounded-xl p-5">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-primary">
          Metas percentuais
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { campo: "presenca" as const, rotulo: "Presença mínima (%)" },
            { campo: "falta" as const, rotulo: "Falta máxima (%)" },
            { campo: "cancelamento" as const, rotulo: "Cancelamento máximo (%)" },
          ].map((m) => (
            <div key={m.campo}>
              <Label className="mb-1.5 block text-xs">{m.rotulo}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={metas[m.campo]}
                onChange={(e) =>
                  setMetas((prev) => ({ ...prev, [m.campo]: Number(e.target.value) }))
                }
              />
            </div>
          ))}
        </div>
        <Button onClick={() => void salvarMetas()} disabled={salvar.isPending}>
          <Save className="mr-2 h-4 w-4" /> Salvar metas
        </Button>
      </div>

      <div className="surface-panel space-y-4 rounded-xl p-5">
        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-primary">
            Mapeamento de status
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Informe os termos aceitos em cada categoria, separados por vírgula. Acentos e
            maiúsculas são ignorados na leitura da planilha.
          </p>
        </div>
        {GRUPOS.map((g) => (
          <div key={g.chave}>
            <Label className="mb-1.5 block text-xs">
              {g.titulo} <span className="text-muted-foreground">— {g.ajuda}</span>
            </Label>
            <Textarea
              rows={2}
              value={mapeamento[g.chave].join(", ")}
              onChange={(e) =>
                setMapeamento((prev) => ({
                  ...prev,
                  [g.chave]: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                }))
              }
            />
          </div>
        ))}
        <Button onClick={() => void salvarMapeamento()} disabled={salvar.isPending}>
          <Save className="mr-2 h-4 w-4" /> Salvar mapeamento
        </Button>
      </div>
    </div>
  );
}