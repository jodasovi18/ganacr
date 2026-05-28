import { useState, useRef, useEffect } from 'react';
import { useFinca } from '@/contexts/FincaContext';
import { useCrearFinca } from '@/hooks/useFincas';

export default function FincaSelector() {
  const { fincas, fincaActiva, setFincaActiva, loading } = useFinca();
  const { crearFinca } = useCrearFinca();
  const [open, setOpen] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (loading || !fincaActiva) return null;

  const hasMultiple = fincas.length > 1;

  async function handleCrearFinca(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setError('');
    setSaving(true);
    try {
      const newId = await crearFinca(nombre.trim());
      // fincas list will update via onSnapshot; find the new one
      setFincaActiva({ id: newId, nombre: nombre.trim(), userId: fincaActiva!.userId, createdAt: '', updatedAt: '' });
      setShowNueva(false);
      setNombre('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la finca');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="finca-selector" ref={dropdownRef}>
      {/* Chip — always visible */}
      <button
        className={`finca-selector-chip${hasMultiple ? ' clickable' : ''}`}
        onClick={() => hasMultiple && setOpen((o) => !o)}
        aria-haspopup={hasMultiple ? 'listbox' : undefined}
        aria-expanded={hasMultiple ? open : undefined}
        title={fincaActiva.nombre}
      >
        <span aria-hidden="true">🌾</span>
        <span className="finca-selector-nombre">{fincaActiva.nombre}</span>
        {hasMultiple && (
          <span className="finca-selector-arrow" aria-hidden="true">
            {open ? '▲' : '▼'}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="finca-selector-dropdown" role="listbox">
          {fincas.map((f) => (
            <button
              key={f.id}
              className={`finca-selector-option${f.id === fincaActiva.id ? ' active' : ''}`}
              role="option"
              aria-selected={f.id === fincaActiva.id}
              onClick={() => { setFincaActiva(f); setOpen(false); }}
            >
              {f.id === fincaActiva.id && <span className="finca-check">✓</span>}
              {f.nombre}
            </button>
          ))}
          <button
            className="finca-selector-nueva"
            onClick={() => { setShowNueva(true); setOpen(false); }}
          >
            ＋ Nueva finca
          </button>
        </div>
      )}

      {/* Nueva finca modal */}
      {showNueva && (
        <div className="modal-overlay" onClick={() => setShowNueva(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva finca</h2>
              <button className="modal-close" onClick={() => setShowNueva(false)}>×</button>
            </div>
            <form onSubmit={handleCrearFinca}>
              <div className="form-group">
                <label className="form-label">Nombre de la finca</label>
                <input
                  className="input"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Finca El Roble"
                  required
                  autoFocus
                  maxLength={60}
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowNueva(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving || !nombre.trim()}>
                  {saving ? 'Creando...' : 'Crear finca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
