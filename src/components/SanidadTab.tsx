import { EventoSanitario, TipoEventoSanitario } from '@/types';
import { formatColones, formatFecha } from '@/utils/calculadora';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<TipoEventoSanitario, string> = {
  vacuna:        '💉 Vacuna',
  tratamiento:   '💊 Tratamiento',
  desparasitante:'🔬 Desparasit.',
  vitamina:      '🌿 Vitamina',
  otro:          '➕ Otro',
};

function alertaProximaDosis(proximaDosis?: string): 'ok' | 'warn' | 'vencida' | null {
  if (!proximaDosis) return null;
  const diffDias = Math.ceil((new Date(proximaDosis).getTime() - Date.now()) / 86_400_000);
  if (diffDias < 0) return 'vencida';
  if (diffDias <= 14) return 'warn';
  return 'ok';
}

const ALERTA_LABEL = {
  ok:      '🟢 Próxima dosis:',
  warn:    '🟡 Próxima dosis:',
  vencida: '🔴 Próxima dosis vencida:',
};

// ─── Componente ──────────────────────────────────────────────────────────────

interface Props {
  eventos: EventoSanitario[];
  loading: boolean;
  animalesMap: Record<string, string>;
  onNuevo: () => void;
  onEliminar: (evento: EventoSanitario) => void;
  deletingId: string | null;
}

export default function SanidadTab({
  eventos,
  loading,
  animalesMap,
  onNuevo,
  onEliminar,
  deletingId,
}: Props) {
  if (loading) {
    return (
      <div className="flex justify-center items-center gap-2 py-12 text-sm text-[hsl(var(--muted-foreground))]">
        <div className="w-4 h-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
        Cargando eventos sanitarios...
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={onNuevo}>+ Agregar evento</Button>
      </div>

      {eventos.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="text-3xl">🩺</div>
          <h3 className="font-semibold">Sin eventos sanitarios</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Registrá vacunas, desparasitaciones y tratamientos del lote.</p>
          <Button onClick={onNuevo}>+ Registrar primer evento</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {eventos.map((ev) => {
            const alerta = alertaProximaDosis(ev.proximaDosis);
            return (
              <div key={ev.id} className="flex gap-3 rounded-lg border border-[hsl(var(--border))] p-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm truncate">{ev.nombreProducto}</strong>
                    <span className="text-sm font-semibold shrink-0">{formatColones(ev.costo)}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs">{TIPO_LABEL[ev.tipo]}</Badge>
                    {ev.animalId ? (
                      <Badge variant="outline" className="text-xs">
                        Arete #{animalesMap[ev.animalId] ?? ev.animalId}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Lote completo</Badge>
                    )}
                  </div>

                  {alerta && ev.proximaDosis && (
                    <div className={`text-xs rounded px-2 py-1 ${
                      alerta === 'vencida' ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' :
                      alerta === 'warn' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' :
                      'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'
                    }`}>
                      {ALERTA_LABEL[alerta]} {formatFecha(ev.proximaDosis)}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                    <span>{formatFecha(ev.fecha)}</span>
                    {ev.quienAplico && <><span>·</span><span>{ev.quienAplico}</span></>}
                    {ev.dosis && <><span>·</span><span>{ev.dosis}</span></>}
                  </div>
                </div>

                <div className="shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Eliminar"
                    onClick={() => onEliminar(ev)}
                    disabled={deletingId === ev.id}
                    className="text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
