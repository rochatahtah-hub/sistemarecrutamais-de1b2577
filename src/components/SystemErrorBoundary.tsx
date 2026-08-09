import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { registrarErroSistema } from "@/lib/system-health";

interface Props {
  children: ReactNode;
  componente: string;
}

interface State {
  error: Error | null;
}

export class SystemErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const enriquecido = new Error(error.message, { cause: error });
    enriquecido.stack = `${error.stack ?? ""}\n${info.componentStack ?? ""}`;
    void registrarErroSistema(enriquecido, {
      componente: this.props.componente,
      operacao: "renderização",
      categoria: "frontend",
    });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="surface-panel flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangle className="h-7 w-7 text-destructive" />
        <div>
          <h2 className="font-display font-semibold">Esta área encontrou uma falha</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O restante do sistema continua disponível. O diagnóstico foi registrado.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => this.setState({ error: null })}>
          Tentar novamente
        </Button>
      </div>
    );
  }
}