import { useState, FormEvent } from 'react';
import { useAgregarAnimal } from '@/hooks/useAnimales';

interface Props { loteId: string; onClose: () => void; }

export default function AgregarAnimalModal({ loteId, onClose }: Props) {
  const { agregarAnimal } = useAgregarAnimal();
  const [numeroArete, setNumeroArete] = useState('');
  const [raza, setRaza] = useState('');
  const [numeroSubasta, setNumeroSubasta] = useState('');
  const [pesoInicial, setPesoInicial] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!numeroArete.trim() || !raza.trim() || !pesoInicial || !precioCompra) {
      setError('Todos los campos marcados son requeridos');
      return;
    }
    setLoading(true);
    try {
      await agregarAnimal({
        loteId,
        numeroArete: numeroArete.trim().toUpperCase(),
        raza: raza.trim(),
        numeroSubasta: numeroSubasta.trim(),
        pesoInicial: Number(pesoInicial),
        precioCompra: Number(precioCompra),
        fechaIngreso,
        notas,
      });
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
          <h2>🐄 Agregar Animal</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Número de arete *</label>
              <input className="form-input" placeholder="Ej: CR-001234" value={numeroArete} onChange={(e) => setNumeroArete(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">N° subasta</label>
              <input className="form-input" placeholder="Ej: 45" value={numeroSubasta} onChange={(e) => setNumeroSubasta(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Raza *</label>
            <select className="form-select" value={raza} onChange={(e) => setRaza(e.target.value)} required>
              <option value="">Seleccionar raza...</option>
              <option>Brahman</option>
              <option>Holstein</option>
              <option>Jersey</option>
              <option>Pardo Suizo</option>
              <option>Nelore</option>
              <option>Charolais</option>
              <option>Angus</option>
              <option>Simmental</option>
              <option>Criollo</option>
              <option>Mestizo</option>
              <option>Otra</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Peso inicial (kg) *</label>
              <input className="form-input" type="number" min="1" step="0.5" placeholder="Ej: 320" value={pesoInicial} onChange={(e) => setPesoInicial(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Precio de compra (₡) *</label>
              <input className="form-input" type="number" min="1" step="any" placeholder="Ej: 450000" value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Fecha de ingreso</label>
            <input className="form-input" type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-textarea" rows={2} placeholder="Observaciones del animal..." value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>

          {error && <div className="form-error mb-2">{error}</div>}

          <div className="flex gap-1 mt-2">
            <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Guardando...' : 'Agregar Animal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
