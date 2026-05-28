import { useState, useRef, useEffect } from 'react';
import { useFinca } from '@/contexts/FincaContext';
import { useCrearFinca, useActualizarFinca } from '@/hooks/useFincas';
import './FincaSelector.css';

export default function FincaSelector() {
  const { fincas, fincaActiva, setFincaActiva, loading } = useFinca();
  const { crearFinca } = useCrearFinca();
  const { actualizarUmbrales } = useActualizarFinca();
  const [open, setOpen] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAjustes, setShowAjustes] = useState(false);
  const [umbralAmarillo, setUmbralAmarillo] = useState<number>(
    fincaActiva?.pesoUmbralAmarillo ?? 15
  );
  const [umbralRojo, setUmbralRojo] = useState<number>(
    fincaActiva?.pesoUmbralRojo ?? 30
  );
  const [savingUmbrales, setSavingUmbrales] = useState(false);
  const [umbralError, setUmbralError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync threshold state when active finca changes (prevents stale values on finca switch)
  useEffect(() => {
    setUmbralAmarillo(fincaActiva?.pesoUmbralAmarillo ?? 15);
    setUmbralRojo(fincaActiva?.pesoUmbralRojo ?? 30);
  }, [fincaActiva?.id]);

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

  async function handleGuardarUmbrales(e: React.FormEvent) {
    e.preventDefault();
    if (umbralAmarillo <= 0 || umbralRojo <= umbralAmarillo) {
      setUmbralError('El umbral rojo debe ser mayor que el amarillo, y ambos deben ser > 0');
      return;
    }
    setUmbralError('');
    setSavingUmbrales(true);
    try {
      if (!fincaActiva) return;
      await actualizarUmbrales(fincaActiva.id, umbralAmarillo, umbralRojo);
      setShowAjustes(false);
    } catch (err) {
      setUmbralError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingUmbrales(false);
    }
  }

  return (
    <div className="finca-selector" ref={dropdownRef}>
      {/* Chip — always visible */}
      <button
        className="finca-selector-chip clickable"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={fincaActiva.nombre}
      >
        <span aria-hidden="true">🌾</span>
        <span className="finca-selector-nombre">{fincaActiva.nombre}</span>
        <span className="finca-selector-arrow" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Ajustes button — only visible when dropdown is closed */}
      {!open && (
        <button
          className="finca-ajustes-btn"
          title="Ajustes de la finca"
          onClick={() => {
            setUmbralAmarillo(fincaActiva?.pesoUmbralAmarillo ?? 15);
            setUmbralRojo(fincaActiva?.pesoUmbralRojo ?? 30);
            setShowAjustes(true);
          }}
        >
          ⚙️
        </button>
      )}

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

      {/* Ajustes modal */}
      {showAjustes && (
        <div className="modal-overlay" onClick={() => setShowAjustes(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ajustes de pesaje — {fincaActiva?.nombre}</h2>
              <button className="modal-close" onClick={() => setShowAjustes(false)}>×</button>
            </div>
            <form onSubmit={handleGuardarUmbrales}>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Configurá cuántos días sin pesar activan cada alerta en la tab Pesos.
              </p>
              <div className="form-group">
                <label className="form-label">
                  🟡 Días sin pesar → amarillo
                </label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={365}
                  value={umbralAmarillo}
                  onChange={(e) => setUmbralAmarillo(Number(e.target.value))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  🔴 Días sin pesar → rojo
                </label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={365}
                  value={umbralRojo}
                  onChange={(e) => setUmbralRojo(Number(e.target.value))}
                  required
                />
              </div>
              {umbralError && <p className="form-error">{umbralError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAjustes(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingUmbrales}
                >
                  {savingUmbrales ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
