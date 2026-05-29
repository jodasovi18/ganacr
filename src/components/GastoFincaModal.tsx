import { useState, FormEvent } from 'react';
import { useAgregarGastoFinca } from '@/hooks/useGastosFinca';
import { formatColones } from '@/utils/calculadora';
import { Lote, TipoGasto } from '@/types';
import './GastoFincaModal.css';

interface Props {
  fincaId: string;
  lotes: Lote[];
  onClose: () => void;
}

const TIPOS: { value: TipoGasto; label: string }[] = [
  { value: 'alimento',    label: '🌾 Alimento' },
  { value: 'veterinario', label: '💉 Veterinario' },
  { value: 'mano_de_obra',label: '👷 Mano de obra' },
  { value: 'transporte',  label: '🚛 Transporte' },
  { value: 'otro',        label: '📋 Otro' },
];

export default function GastoFincaModal({ fincaId, lotes, onClose }: Props) {
  const { agregarGastoFinca } = useAgregarGastoFinca();

  const [concepto, setConcepto]   = useState('');
  const [tipo, setTipo]           = useState<TipoGasto>('otro');
  const [montoRaw, setMontoRaw]   = useState('');
  const [fecha, setFecha]         = useState(new Date().toISOString().split('T')[0]);
  const [quienPago, setQuienPago] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Default: lotes propios con activos > 0 → checked; lotes a medias → unchecked
  const [seleccionados, setSeleccionados] = useState<Set<string>>(
    () => new Set(
      lotes
        .filter((l) => l.tipoPropiedad === 'propio' && l.animalesActivos > 0)
        .map((l) => l.id)
    )
  );

  const monto = parseFloat(montoRaw) || 0;
  const lotesEnDistribucion = lotes.filter(
    (l) => seleccionados.has(l.id) && l.animalesActivos > 0
  );
  const totalActivos = lotesEnDistribucion.reduce((s, l) => s + l.animalesActivos, 0);

  function montoPara(lote: Lote): number | null {
    if (monto <= 0 || totalActivos === 0 || !seleccionados.has(lote.id)) return null;
    return Math.round(monto * lote.animalesActivos / totalActivos);
  }

  function toggleLote(loteId: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(loteId)) next.delete(loteId); else next.add(loteId);
      return next;
    });
  }

  const canSubmit = concepto.trim().length > 0 && monto > 0 && lotesEnDistribucion.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      await agregarGastoFinca({
        fincaId,
        concepto: concepto.trim(),
        tipo,
        montoTotal: monto,
        fecha,
        quienPago: quienPago.trim() || undefined,
        lotesSeleccionados: lotesEnDistribucion.map((l) => ({
          loteId: l.id,
          nombreLote: l.nombreLote,
          animalesActivos: l.animalesActivos,
        })),
      });
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Error al registrar gasto');
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal gasto-finca-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💸 Nuevo gasto de finca</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">

          <div className="form-group">
            <label>Concepto *</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Vacunación masiva"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoGasto)}>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Monto total (₡) *</label>
              <input
                type="number"
                value={montoRaw}
                onChange={(e) => setMontoRaw(e.target.value)}
                placeholder="0"
                min="1"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fecha *</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Quién pagó</label>
              <input
                type="text"
                value={quienPago}
                onChange={(e) => setQuienPago(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="lotes-selector-label">Aplicar a lotes</div>
          <div className="lotes-selector">
            {lotes.length === 0 ? (
              <p className="lotes-selector-empty">
                Esta finca no tiene lotes. Creá un lote primero.
              </p>
            ) : (
              lotes.map((lote) => {
                const disabled   = lote.animalesActivos === 0;
                const checked    = seleccionados.has(lote.id);
                const esMedias   = lote.tipoPropiedad === 'medias';
                const estimado   = montoPara(lote);
                return (
                  <label
                    key={lote.id}
                    className={[
                      'lote-selector-item',
                      checked  ? 'selected' : '',
                      disabled ? 'disabled' : '',
                      esMedias ? 'medias'   : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => { if (!disabled) toggleLote(lote.id); }}
                    />
                    <span className="lote-selector-nombre">
                      {esMedias && '🤝 '}
                      {lote.nombreLote}
                      {esMedias && (
                        <span className="lote-selector-medias-hint">
                          {' '}(a medias — seleccioná explícitamente)
                        </span>
                      )}
                    </span>
                    <span className="lote-selector-activos">
                      {disabled ? '0 act.' : `${lote.animalesActivos} act.`}
                    </span>
                    <span className="lote-selector-monto">
                      {disabled || estimado === null
                        ? '—'
                        : `≈ ${formatColones(estimado)}`}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {lotesEnDistribucion.length > 0 && monto > 0 && (
            <div className="distribucion-resumen">
              Total: <strong>{formatColones(monto)}</strong>
              {' · '}{lotesEnDistribucion.length} lote{lotesEnDistribucion.length !== 1 ? 's' : ''}
              {' · '}{totalActivos} animales activos
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!canSubmit || loading}
            >
              {loading ? 'Registrando...' : 'Registrar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
