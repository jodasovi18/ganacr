import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Captura errores de renderizado en cualquier parte del árbol y muestra una
 * pantalla amable en vez de una página en blanco. Punto único de enganche para
 * el monitoreo de errores (Sentry) en `componentDidCatch`.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // TODO(monitoreo): reemplazar por Sentry.captureException(error) cuando esté el DSN.
    console.error('[ErrorBoundary] Error no capturado:', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-5xl">🐄</div>
          <h1 className="text-xl font-semibold text-foreground">Algo salió mal</h1>
          <p className="text-muted-foreground">
            Ocurrió un error inesperado. Tus datos están a salvo. Probá recargar la página.
          </p>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition hover:opacity-90"
          >
            Recargar
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 max-h-48 overflow-auto rounded bg-destructive/10 p-3 text-left text-xs text-destructive">
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
