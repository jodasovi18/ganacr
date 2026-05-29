import { EventoSanitario, TipoEventoSanitario } from '@/types';
import { formatColones, formatFecha } from '@/utils/calculadora';
import './SanidadTab.css';

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
  animalesMap: Record<string, string>; // animalId → numeroArete
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
      <div className="loading-container">
        <div className="loading-spinner" />
        <span>Cargando eventos sanitarios...</span>
      </div>
    );
  }

  return (
    <div className="sanidad-tab">
      <div className="sanidad-tab-header">
        <button className="btn btn-primary btn-sm" onClick={onNuevo}>
          + Agregar evento
        </button>
      </div>

      {eventos.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">🩺</div>
          <h3>Sin eventos sanitarios</h3>
          <p>Registrá vacunas, desparasitaciones y tratamientos del lote.</p>
          <button className="btn btn-primary" onClick={onNuevo}>+ Registrar primer evento</button>
        </div>
      ) : (
        <div className="sanidad-list">
          {eventos.map((ev) => {
            const alerta = alertaProximaDosis(ev.proximaDosis);
            return (
              <div key={ev.id} className="evento-card">
                <div className="evento-card-body">
                  <div className="evento-card-top">
                    <strong className="evento-nombre">{ev.nombreProducto}</strong>
                    <span className="evento-costo">{formatColones(ev.costo)}</span>
                  </div>
                  <div className="evento-chips">
                    <span className={`chip chip-tipo chip-${ev.tipo}`}>{TIPO_LABEL[ev.tipo]}</span>
                    {ev.animalId ? (
                      <span className="chip chip-animal">
                        Arete #{animalesMap[ev.animalId] ?? ev.animalId}
                      </span>
                    ) : (
                      <span className="chip chip-lote">Lote completo</span>
                    )}
                  </div>
                  {alerta && ev.proximaDosis && (
                    <div className={`evento-proxima evento-proxima--${alerta}`}>
                      {ALERTA_LABEL[alerta]} {formatFecha(ev.proximaDosis)}
                    </div>
                  )}
                  <div className="evento-meta">
                    <span>{formatFecha(ev.fecha)}</span>
                    {ev.quienAplico && <><span>·</span><span>{ev.quienAplico}</span></>}
                    {ev.dosis && <><span>·</span><span>{ev.dosis}</span></>}
                  </div>
                </div>
                <div className="evento-card-side">
                  <button
                    className="btn btn-ghost btn-sm"
                    title="Eliminar"
                    onClick={() => onEliminar(ev)}
                    disabled={deletingId === ev.id}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
