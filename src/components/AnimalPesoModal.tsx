import { useState } from 'react';
import { Animal, Lote } from '@/types';
import { usePesos } from '@/hooks/usePesos';
import { formatKg, formatFecha } from '@/utils/calculadora';
import AnimalWeightChart from '@/components/svg/AnimalWeightChart';
import RegistrarPesoModal from '@/components/RegistrarPesoModal';
import './AnimalPesoModal.css';

interface Props {
  animal: Animal;
  lote: Lote;
  pesoPromedioLote: number;
  onClose: () => void;
}

export default function AnimalPesoModal({ animal, lote, pesoPromedioLote, onClose }: Props) {
  const { pesos, loading } = usePesos(animal.id);
  const [showRegistrar, setShowRegistrar] = useState(false);

  // pesos from hook come desc — reverse for chart (needs asc)
  const pesosAsc = [...pesos].reverse();

  // ── Stat calculations ──────────────────────────────────────────────────────
  const pesoActual = animal.pesoActual;
  const pesoInicial = animal.pesoInicial;
  const kgGanados = pesoActual - pesoInicial;

  const kgPorDia = (() => {
    if (pesosAsc.length < 2) return null;
    const first = pesosAsc[0];
    const last = pesosAsc[pesosAsc.length - 1];
    const dias = Math.max(
      1,
      Math.round(
        (new Date(last.fecha).getTime() - new Date(first.fecha).getTime()) /
          86_400_000
      )
    );
    return (last.peso - first.peso) / dias;
  })();

  const vsPromedio = pesoActual - pesoPromedioLote;

  // ── Historial rows ─────────────────────────────────────────────────────────
  // Show newest first (pesos comes desc from hook)
  const historial = pesos.map((p, i) => {
    const prev = pesos[i + 1]; // next in desc = previous in time
    const delta = prev ? p.peso - prev.peso : null;
    return { ...p, delta };
  });
  const tieneNotas = historial.some((h) => h.notas);

  if (showRegistrar) {
    return (
      <RegistrarPesoModal
        fincaId={lote.fincaId}
        animal={animal}
        loteId={lote.id}
        onClose={() => setShowRegistrar(false)}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal bottom-sheet animal-peso-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1rem' }}>
              {animal.numeroArete} — {animal.raza}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
              Lote {lote.nombreLote}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-container" style={{ minHeight: '120px' }}>
              <div className="loading-spinner" />
            </div>
          ) : pesos.length === 0 ? (
            /* ── No pesajes yet ── */
            <div className="peso-primer-estado">
              <p>Este animal aún no tiene pesajes registrados.</p>
              <button className="btn btn-primary" onClick={() => setShowRegistrar(true)}>
                + Registrar primer peso
              </button>
            </div>
          ) : (
            <>
              {/* ── Stat cards ── */}
              <div className="peso-stat-grid">
                <div className="peso-stat-card">
                  <div className="peso-stat-value">{formatKg(pesoActual)}</div>
                  <div className="peso-stat-label">Peso actual</div>
                </div>
                <div className="peso-stat-card">
                  <div className={`peso-stat-value ${kgGanados >= 0 ? 'positive' : 'negative'}`}>
                    {kgGanados >= 0 ? '+' : ''}{formatKg(kgGanados)}
                  </div>
                  <div className="peso-stat-label">Total ganado</div>
                </div>
                <div className="peso-stat-card">
                  <div className="peso-stat-value">
                    {kgPorDia !== null ? kgPorDia.toFixed(2) : '—'}
                  </div>
                  <div className="peso-stat-label">kg/día</div>
                </div>
                <div className="peso-stat-card">
                  <div className={`peso-stat-value ${vsPromedio >= 0 ? 'positive' : 'negative'}`}>
                    {vsPromedio >= 0 ? '+' : ''}{formatKg(vsPromedio)}
                  </div>
                  <div className="peso-stat-label">vs. prom. lote</div>
                </div>
              </div>

              {/* ── Chart ── */}
              <div className="animal-chart-wrap">
                <div className="animal-chart-title">
                  Evolución de peso
                  <span className="animal-chart-count">{pesos.length} pesaje{pesos.length !== 1 ? 's' : ''}</span>
                </div>
                <AnimalWeightChart
                  pesos={pesosAsc}
                  pesoPromedioLote={pesoPromedioLote}
                />
              </div>

              {/* ── Historial ── */}
              <p className="peso-historial-title">Historial</p>
              <table className="peso-historial-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Peso</th>
                    <th>Delta</th>
                    {tieneNotas && <th>Notas</th>}
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h) => (
                    <tr key={h.id}>
                      <td>{formatFecha(h.fecha)}</td>
                      <td><strong>{formatKg(h.peso)}</strong></td>
                      <td>
                        {h.delta !== null ? (
                          <span className={h.delta >= 0 ? 'peso-delta-pos' : 'peso-delta-neg'}>
                            {h.delta >= 0 ? '+' : ''}{formatKg(h.delta)}
                          </span>
                        ) : '—'}
                      </td>
                      {tieneNotas && (
                        <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {h.notas || '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ── Registrar peso button ── */}
              {animal.estado === 'activo' && (
                <div className="peso-modal-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowRegistrar(true)}>
                    + Registrar peso
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
