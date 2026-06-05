import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

/**
 * Marco común para las páginas legales. Recibe el contenido en Markdown (fuente
 * única en src/content/legal) y lo renderiza con estilos de la paleta Campo Claro.
 */
export default function LegalPageLayout({ content }: { content: string }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-foreground">
            <span className="text-2xl">🐄</span> GanaCR
          </Link>
          <Link to="/" className="text-sm text-primary hover:underline">← Volver a la app</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <article
          className="
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mb-1
            [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-2
            [&_p]:text-sm [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:my-3
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-sm [&_ul]:text-muted-foreground [&_ul]:space-y-1 [&_ul]:my-3
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-sm [&_ol]:text-muted-foreground [&_ol]:space-y-1 [&_ol]:my-3
            [&_strong]:font-semibold [&_strong]:text-foreground
            [&_a]:text-primary [&_a]:underline
          "
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
