import { useState, FormEvent } from 'react';
import { useCrearLote } from '@/hooks/useLotes';

interface Props { onClose: () => void; }

export default function CrearLoteModal({ onClose }: Props) {
  const { crearLote } = useCrearLote();
  const [nombre, setNombre] = useState('');
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState<'propio' | 'medias'>('propio');
  const [socioNombre, setSocioNombre] = useState('');
  const [socioPorcentaje, setSocioPorcentaje] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) { setError('El nombre del lote es requerido'); return; }
    if (tipo === 'medias' && !socioNombre.trim()) { setError('El nombre del socio es requerido'); return; }
    setLoading(true);
    try {
      await crearLote({
        nombreLote: nombre,
        fechaCompra,
        tipoPropiedad: tipo,
        socio: tipo === 'medias' ? { nombre: socioNombre, porcentaje: socioPorcentaje } : undefined,
      });
      onClose();
    } catch (err) {
      setError('Error al crear lote: ' + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>🐄 Nuevo Lote</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre del lote *</label>
            <input className="form-input" placeholder="Ej: Lote Enero 2026" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Fecha de compra</label>
            <input className="form-input" type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Tipo de propiedad</label>
            <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value as 'propio' | 'medias')}>
              <option value="propio">100% Propio</option>
              <option value="medias">A medias con socio</option>
            </select>
          </div>

          {tipo === 'medias' && (
            <>
              <div className="form-group">
                <label className="form-label">Nombre del socio *</label>
                <input className="form-input" placeholder="Ej: Juan Pérez" value={socioNombre} onChange={(e) => setSocioNombre(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Porcentaje del socio: {socioPorcentaje}% / {100 - socioPorcentaje}% tuyo</label>
                <input type="range" min={10} max={90} step={5} value={socioPorcentaje} onChange={(e) => setSocioPorcentaje(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
              </div>
            </>
          )}

          {error && <div className="form-error mb-2">{error}</div>}

          <div className="flex gap-1 mt-2">
            <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Lote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
