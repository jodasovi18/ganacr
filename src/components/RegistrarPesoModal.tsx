import { useState, FormEvent } from 'react';
import { useRegistrarPeso } from '@/hooks/usePesos';
import { Animal } from '@/types';
import { formatKg } from '@/utils/calculadora';

interface Props { fincaId: string; animal: Animal; loteId: string; onClose: () => void; }

export default function RegistrarPesoModal({ fincaId, animal, loteId, onClose }: Props) {
  const { registrarPeso } = useRegistrarPeso();
  const [peso, setPeso] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const gananciaPreview = peso ? Number(peso) - animal.pesoActual : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!peso || Number(peso) <= 0) { setError('Ingresá un peso válido'); return; }
    setLoading(true);
    try {
      await registrarPeso({ fincaId, animalId: animal.id, loteId, peso: Number(peso), fecha, notas });
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
          <h2>⚖️ Registrar Peso</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="card mb-2" style={{ background: 'var(--color-bg)' }}>
          <p><strong>Arete:</strong> {animal.numeroArete} — {animal.raza}</p>
          <p><strong>Peso actual:</strong> {formatKg(animal.pesoActual)}</p>
          <p><strong>Peso inicial:</strong> {formatKg(animal.pesoInicial)}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nuevo peso (kg) *</label>
              <input className="form-input" type="number" min="1" step="0.5" placeholder="Ej: 350" value={peso} onChange={(e) => setPeso(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input className="form-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          {gananciaPreview !== null && (
            <div className={`card mb-2 ${gananciaPreview >= 0 ? 'text-success' : 'text-danger'}`}>
              Cambio: {gananciaPreview >= 0 ? '+' : ''}{formatKg(gananciaPreview)} respecto al peso actual
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-textarea" rows={2} placeholder="Observaciones del pesaje..." value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>

          {error && <div className="form-error mb-2">{error}</div>}

          <div className="flex gap-1 mt-2">
            <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar Peso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
