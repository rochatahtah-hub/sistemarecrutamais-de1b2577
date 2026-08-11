import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useVagas } from "@/lib/dados";
import { usePrivacidade } from "@/lib/privacidade";
import { fmtData } from "@/lib/metricas";
import { STATUS_LABEL } from "@/lib/tipos";

interface Resultado {
  grupo: string;
  chave: string;
  titulo: string;
  detalhe: string;
  ir: () => void;
}

/** Busca global: candidatos, empresas, colaboradores, vagas e confirmações. */
export function BuscaGlobal() {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const navigate = useNavigate();
  const priv = usePrivacidade();
  const { data: registros = [] } = useVagas();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAberto((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const resultados = useMemo<Resultado[]>(() => {
    const t = termo.trim().toLowerCase();
    if (t.length < 2) return [];
    const bate = (v: string) => v.toLowerCase().includes(t);
    const saida: Resultado[] = [];
    const vistos = new Set<string>();

    const add = (r: Resultado) => {
      const k = `${r.grupo}|${r.chave}`;
      if (vistos.has(k)) return;
      vistos.add(k);
      if (saida.length < 60) saida.push(r);
    };

    for (const r of registros) {
      if (r.empresa && bate(r.empresa)) {
        add({
          grupo: "Empresas",
          chave: r.empresa,
          titulo: r.empresa,
          detalhe: "Abrir painel da empresa",
          ir: () => navigate({ to: "/empresas/$nome", params: { nome: r.empresa } }),
        });
      }
      if (r.colaborador && bate(r.colaborador)) {
        add({
          grupo: "Colaboradores",
          chave: r.colaborador,
          titulo: priv.nome(r.colaborador),
          detalhe: "Abrir perfil do colaborador",
          ir: () => navigate({ to: "/colaboradores/$nome", params: { nome: r.colaborador } }),
        });
      }
      const candidato = r.candidato || r.descricao;
      if (candidato && bate(candidato)) {
        add({
          grupo: "Candidatos",
          chave: candidato,
          titulo: priv.nome(candidato),
          detalhe: `${r.empresa} · ${fmtData(r.data)}`,
          ir: () => navigate({ to: "/candidatos" }),
        });
      }
      const cargo = r.cargo || r.descricao;
      if (cargo && bate(cargo)) {
        add({
          grupo: "Vagas",
          chave: r.id,
          titulo: `${cargo} — ${r.empresa}`,
          detalhe: `${fmtData(r.data)} · ${STATUS_LABEL[r.status] ?? r.status}`,
          ir: () => navigate({ to: "/vagas" }),
        });
      }
      if (r.status !== "AGUARDANDO" && (bate(STATUS_LABEL[r.status] ?? "") || bate(r.empresa))) {
        add({
          grupo: "Confirmações",
          chave: `c-${r.id}`,
          titulo: `${STATUS_LABEL[r.status] ?? r.status} — ${r.empresa}`,
          detalhe: `${priv.nome(r.colaborador)} · ${fmtData(r.data)}`,
          ir: () => navigate({ to: "/confirmacoes" }),
        });
      }
    }
    return saida;
  }, [termo, registros, navigate, priv]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, Resultado[]>();
    for (const r of resultados) {
      const lista = mapa.get(r.grupo);
      if (lista) lista.push(r);
      else mapa.set(r.grupo, [r]);
    }
    return Array.from(mapa.entries());
  }, [resultados]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setAberto(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden rounded border border-border px-1.5 text-[10px] text-muted-foreground lg:inline">
          Ctrl K
        </kbd>
      </Button>
      <CommandDialog open={aberto} onOpenChange={setAberto}>
        <CommandInput
          placeholder="Buscar candidatos, empresas, vagas, colaboradores..."
          value={termo}
          onValueChange={setTermo}
        />
        <CommandList>
          <CommandEmpty>
            {termo.trim().length < 2
              ? "Digite ao menos 2 caracteres para buscar."
              : "Nenhum resultado encontrado."}
          </CommandEmpty>
          {grupos.map(([grupo, itens]) => (
            <CommandGroup key={grupo} heading={grupo}>
              {itens.map((r) => (
                <CommandItem
                  key={`${grupo}-${r.chave}`}
                  value={`${grupo} ${r.titulo} ${r.detalhe}`}
                  onSelect={() => {
                    setAberto(false);
                    setTermo("");
                    r.ir();
                  }}
                >
                  <div className="min-w-0">
                    <p className="truncate">{r.titulo}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.detalhe}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
