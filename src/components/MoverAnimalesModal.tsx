import { useState } from 'react';
import { useMoverAnimales } from '@/hooks/useMoverAnimales';
import { Animal, Finca, Lote } from '@/types';
import { formatColones, formatKg } from '@/utils/calculadora';
import './MoverAnimalesModal.css';

interface Props {
  animales: Animal[];        // 1 o más, todos activos
  loteSrc: Lote;             // lote actual
  todosLosLotes: Lote[];     // todos los lotes del usuario (todas las fincas)
  fincas: Finca[];           // para mostrar nombre de cada finca
  onClose: () => void;
  onSuccess: () => void;     // limpia la selección multi-select al terminar
}

export default function MoverAnimalesModal({
  animales, loteSrc, todosLosLotes, fincas, onClose, onSuccess,
}: Props) {
  const { moverAnimales } = useMoverAnimales();
  const [loteDstId, setLoteDstId] = useState('');
  const [precioKg, setPrecioKg] = useState('');
  const [showOtrasFincas, setShowOtrasFincas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loteDst = todosLosLotes.find((l) => l.id === loteDstId) ?? null;

  // Group lotes: same finca (excluding origin), other fincas
  const lotesMismaFinca = todosLosLotes.filter(
    (l) => l.fincaId === loteSrc.fincaId && l.id !== loteSrc.id
  );
  const lotesOtrasFincas = todosLosLotes.filter(
    (l) => l.fincaId !== loteSrc.fincaId
  );

  const fincaMap = new Map(fincas.map((f) => [f.id, f.nombre]));

  const pesoTotal = animales.reduce((s, a) => s + a.pesoActual, 0);
  const precioKgNum = Number(precioKg);
  const totalEstimado = precioKgNum > 0 ? Math.round(precioKgNum * pesoTotal) : 0;

  const canSubmit = loteDstId !== '' && precioKgNum > 0 && !saving;
  const n = animales.length;

  // Group other-finca lotes by finca for display
  const lotesPorFinca = new Map<string, Lote[]>();
  for (const l of lotesOtrasFincas) {
    if (!lotesPorFinca.has(l.fincaId)) lotesPorFinca.set(l.fincaId, []);
    lotesPorFinca.get(l.fincaId)!.push(l);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loteDst || !canSubmit) return;
    setError('');
    setSaving(true);
    try {
      await moverAnimales({ animales, loteSrc, loteDst, precioKg: precioKgNum });
      onSuccess();
      onClose();
    } catch (err) {
      // If Phase 2 failed, the animals moved but peso history may be stale
      const msg = err instanceof Error ? err.message : 'Error al mover los animales';
      if (msg.includes('pesos') || msg.includes('Phase 2')) {
        setError('Los animales fueron movidos, pero el historial de pesajes puede tardar en actualizarse. Cerrá y revisá el lote destino.');
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal mover-modal">
        <div className="modal-header">
          <h2>↗️ Mover {n === 1 ? '1 animal' : `${n} animales`}</h2>
          <button className="modal-close" onClick={onClose} disabled={saving}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Destino ── */}
          <div className="form-group">
            <label className="form-label">Destino</label>

            <div className="mover-group-label">
              {fincaMap.get(loteSrc.fincaId) ?? 'Esta finca'}
            </div>

            {lotesMismaFinca.length === 0 ? (
              <p className="mover-empty">No hay otros lotes en esta finca</p>
            ) : (
              lotesMismaFinca.map((l) => (
                <label
                  key={l.id}
                  className={`mover-lote-option${loteDstId === l.id ? ' selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="loteDst"
                    value={l.id}
                    checked={loteDstId === l.id}
                    onChange={() => setLoteDstId(l.id)}
                  />
                  <span className="mover-lote-nombre">{l.nombreLote}</span>
                  <span className="mover-lote-count">{l.animalesActivos} activos</span>
                </label>
              ))
            )}

            {lotesOtrasFincas.length > 0 && (
              <>
                <button
                  type="button"
                  className="mover-toggle-fincas"
                  onClick={() => setShowOtrasFincas((v) => !v)}
                >
                  Otras fincas {showOtrasFincas ? '▲' : '▼'}
                </button>

                {showOtrasFincas && [...lotesPorFinca.entries()].map(([fId, lts]) => (
                  <div key={fId}>
                    <div className="mover-group-label mover-group-label--other">
                      {fincaMap.get(fId) ?? fId}
                    </div>
                    {lts.map((l) => (
                      <label
                        key={l.id}
                        className={`mover-lote-option${loteDstId === l.id ? ' selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="loteDst"
                          value={l.id}
                          checked={loteDstId === l.id}
                          onChange={() => setLoteDstId(l.id)}
                        />
                        <span className="mover-lote-nombre">{l.nombreLote}</span>
                        <span className="mover-lote-count">{l.animalesActivos} activos</span>
                      </label>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* ── Precio de traspaso ── */}
          <div className="form-group">
            <label className="form-label">Precio de traspaso</label>
            <div className="mover-precio-wrap">
              <span className="mover-precio-symbol">₡</span>
              <input
                type="number"
                className="input mover-precio-input"
                min={1}
                step={1}
                placeholder="0"
                value={precioKg}
                onChange={(e) => setPrecioKg(e.target.value)}
                required
                autoFocus={lotesMismaFinca.length === 0}
              />
              <span className="mover-precio-unit">/ kg</span>
            </div>
            {precioKgNum > 0 && (
              <p className="mover-total-estimado">
                Total estimado: {formatColones(totalEstimado)}
                {' '}· {n} animal{n !== 1 ? 'es' : ''} · {formatKg(pesoTotal)} totales
              </p>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!canSubmit}
            >
              {saving
                ? 'Moviendo...'
                : `Mover ${n === 1 ? 'animal' : `${n} animales`}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
