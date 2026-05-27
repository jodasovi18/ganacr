import { useState, FormEvent } from 'react';
import { useAgregarGasto } from '@/hooks/useGastos';
import { TipoGasto } from '@/types';

interface Props { loteId: string; onClose: () => void; }

const TIPOS: { value: TipoGasto; label: string }[] = [
  { value: 'alimento', label: '🌾 Alimento' },
  { value: 'veterinario', label: '💉 Veterinario' },
  { value: 'mano_de_obra', label: '👷 Mano de obra' },
  { value: 'transporte', label: '🚛 Transporte' },
  { value: 'otro', label: '📋 Otro' },
];

export default function AgregarGastoModal({ loteId, onClose }: Props) {
  const { agregarGasto } = useAgregarGasto();
  const [concepto, setConcepto] = useState('');
  const [tipo, setTipo] = useState<TipoGasto>('alimento');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [quienPago, setQuienPago] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!concepto.trim() || !monto) { setError('Concepto y monto son requeridos'); return; }
    setLoading(true);
    try {
      await agregarGasto({ loteId, concepto, tipo, monto: Number(monto), fecha, quienPago, notas });
      onClose();
    } catch (err) {
      setError('Error: ' + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>💸 Registrar Gasto</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tipo de gasto</label>
            <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value as TipoGasto)}>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Concepto *</label>
            <input className="form-input" placeholder="Ej: Sales minerales, Ivermectina, etc." value={concepto} onChange={(e) => setConcepto(e.target.value)} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Monto (₡) *</label>
              <input className="form-input" type="number" min="1" step="500" placeholder="Ej: 25000" value={monto} onChange={(e) => setMonto(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input className="form-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Quién pagó (si es a medias)</label>
            <input className="form-input" placeholder="Ej: Juan, Yo, Ambos..." value={quienPago} onChange={(e) => setQuienPago(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-textarea" rows={2} placeholder="Detalle adicional..." value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>

          {error && <div className="form-error mb-2">{error}</div>}

          <div className="flex gap-1 mt-2">
            <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
