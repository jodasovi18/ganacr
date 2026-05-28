import { useState, FormEvent } from 'react';
import { useRegistrarVenta } from '@/hooks/useVentas';
import { Animal, Gasto, Lote, ItemVenta } from '@/types';
import { formatColones, calcularVenta } from '@/utils/calculadora';

interface Props {
  fincaId: string;
  lote: Lote;
  animalesActivos: Animal[];
  gastos: Gasto[];
  onClose: () => void;
}

export default function VenderAnimalesModal({ fincaId, lote, animalesActivos, gastos, onClose }: Props) {
  const { registrarVenta } = useRegistrarVenta();
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [pesos, setPesos] = useState<Record<string, string>>({});
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleAnimal(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const animalesVenta: ItemVenta[] = animalesActivos
    .filter((a) => seleccionados.has(a.id))
    .map((a) => ({
      animalId: a.id,
      numeroArete: a.numeroArete,
      pesoFinal: Number(pesos[a.id] || a.pesoActual),
      precioVenta: Number(precios[a.id] || 0),
      precioCompra: a.precioCompra,
    }));

  const preview = seleccionados.size > 0
    ? calcularVenta(animalesVenta, lote, gastos, lote.totalAnimales)
    : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (seleccionados.size === 0) { setError('Seleccioná al menos un animal'); return; }
    const sinPrecio = animalesVenta.some((a) => !a.precioVenta || a.precioVenta <= 0);
    if (sinPrecio) { setError('Todos los animales seleccionados deben tener precio de venta'); return; }
    setLoading(true);
    try {
      await registrarVenta({ fincaId, lote, animalesVendidos: animalesVenta, fecha, gastos, totalAnimalesEnLote: lote.totalAnimales, notas });
      onClose();
    } catch (err) {
      setError('Error: ' + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h2>💰 Vender Animales</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Fecha de venta</label>
            <input className="form-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>

          <p className="form-label mb-1">Seleccioná los animales a vender:</p>

          <div className="table-wrap mb-2">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Arete</th>
                  <th>Raza</th>
                  <th>Peso actual</th>
                  <th>Peso final (kg)</th>
                  <th>Precio venta (₡)</th>
                </tr>
              </thead>
              <tbody>
                {animalesActivos.map((animal) => {
                  const sel = seleccionados.has(animal.id);
                  return (
                    <tr key={animal.id} style={{ opacity: sel ? 1 : 0.6 }}>
                      <td>
                        <input type="checkbox" checked={sel} onChange={() => toggleAnimal(animal.id)} style={{ accentColor: 'var(--color-primary)', width: 16, height: 16 }} />
                      </td>
                      <td><strong>{animal.numeroArete}</strong></td>
                      <td>{animal.raza}</td>
                      <td>{animal.pesoActual} kg</td>
                      <td>
                        <input
                          className="form-input"
                          type="number" min="1" step="0.5"
                          placeholder={String(animal.pesoActual)}
                          value={pesos[animal.id] || ''}
                          onChange={(e) => setPesos((p) => ({ ...p, [animal.id]: e.target.value }))}
                          disabled={!sel}
                          style={{ width: 90, padding: '0.3rem 0.5rem' }}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          type="number" min="1" step="any"
                          placeholder="0"
                          value={precios[animal.id] || ''}
                          onChange={(e) => setPrecios((p) => ({ ...p, [animal.id]: e.target.value }))}
                          disabled={!sel}
                          style={{ width: 110, padding: '0.3rem 0.5rem' }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Vista previa del cálculo */}
          {preview && seleccionados.size > 0 && (
            <div className="card mb-2" style={{ background: 'var(--color-bg)' }}>
              <p className="form-label mb-1">Resumen de la venta ({seleccionados.size} animales)</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem 1rem', fontSize: '0.9rem' }}>
                <span className="text-muted">Inversión animales:</span> <span>{formatColones(preview.totalInversion)}</span>
                <span className="text-muted">Gastos proporcionales:</span> <span>{formatColones(preview.gastosProporcion)}</span>
                <span className="text-muted">Total venta:</span> <span>{formatColones(preview.totalVenta)}</span>
                <span className="text-muted">Utilidad bruta:</span>
                <span className={preview.utilidadBruta >= 0 ? 'text-success' : 'text-danger'}>
                  <strong>{formatColones(preview.utilidadBruta)}</strong>
                </span>
                {preview.utilidadSocio !== undefined && lote.socio && (
                  <>
                    <span className="text-muted">Utilidad {lote.socio.nombre} ({lote.socio.porcentaje}%):</span>
                    <span className="text-success">{formatColones(preview.utilidadSocio)}</span>
                    <span className="text-muted">Tu utilidad ({100 - lote.socio.porcentaje}%):</span>
                    <span className="text-success">{formatColones(preview.utilidadPropietario ?? 0)}</span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-textarea" rows={2} placeholder="Observaciones de la venta..." value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>

          {error && <div className="form-error mb-2">{error}</div>}

          <div className="flex gap-1 mt-2">
            <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading || seleccionados.size === 0}>
              {loading ? 'Procesando...' : `Registrar Venta (${seleccionados.size} animales)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
