import { useState } from 'react';
import { useAgregarEventoSanitario } from '@/hooks/useEventosSanitarios';
import { Animal, TipoEventoSanitario } from '@/types';
import { formatKg } from '@/utils/calculadora';
import './EventoSanitarioModal.css';

const TIPOS: Array<{ value: TipoEventoSanitario; label: string }> = [
  { value: 'vacuna',         label: '💉 Vacuna' },
  { value: 'tratamiento',    label: '💊 Tratamiento' },
  { value: 'desparasitante', label: '🔬 Desparasit.' },
  { value: 'vitamina',       label: '🌿 Vitamina' },
  { value: 'otro',           label: '➕ Otro' },
];

interface Props {
  loteId: string;
  fincaId: string;
  animales: Animal[];
  animalIdInicial?: string;
  onClose: () => void;
}

export default function EventoSanitarioModal({
  loteId, fincaId, animales, animalIdInicial, onClose,
}: Props) {
  const { agregarEvento } = useAgregarEventoSanitario();

  const [alcance, setAlcance]             = useState<'lote' | 'animal'>(animalIdInicial ? 'animal' : 'lote');
  const [animalQuery, setAnimalQuery]     = useState(() => {
    if (!animalIdInicial) return '';
    return animales.find(a => a.id === animalIdInicial)?.numeroArete ?? '';
  });
  const [animalId, setAnimalId]           = useState(animalIdInicial ?? '');
  const [tipo, setTipo]                   = useState<TipoEventoSanitario>('vacuna');
  const [nombreProducto, setNombreProducto] = useState('');
  const [fecha, setFecha]                 = useState(new Date().toISOString().slice(0, 10));
  const [costo, setCosto]                 = useState('');
  const [dosis, setDosis]                 = useState('');
  const [quienAplico, setQuienAplico]     = useState('');
  const [proximaDosis, setProximaDosis]   = useState('');
  const [notas, setNotas]                 = useState('');
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');

  const animalSeleccionado = animales.find(a => a.id === animalId);
  const animalesFiltrados  = animales.filter(
    a => a.estado === 'activo' &&
         a.numeroArete.toLowerCase().includes(animalQuery.toLowerCase())
  );

  const proximaDosisInvalida = !!proximaDosis && proximaDosis < fecha;
  const animalRequerido = alcance === 'animal' && !animalId;
  const canSave =
    nombreProducto.trim().length > 0 &&
    fecha.length > 0 &&
    Number(costo) > 0 &&
    !animalRequerido &&
    !proximaDosisInvalida;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      await agregarEvento({
        loteId,
        fincaId,
        animalId: alcance === 'animal' ? animalId : undefined,
        tipo,
        nombreProducto: nombreProducto.trim(),
        fecha,
        costo: Number(costo),
        dosis:       dosis.trim()       || undefined,
        quienAplico: quienAplico.trim() || undefined,
        proximaDosis: proximaDosis      || undefined,
        notas:       notas.trim()       || undefined,
      });
      onClose();
    } catch {
      setError('Error al guardar el evento. Intentá de nuevo.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">Agregar evento sanitario</h2>

        <form onSubmit={handleSubmit}>
          {/* Alcance */}
          <div className="form-group">
            <label className="form-label">Aplicar a</label>
            <div className="toggle-alcance">
              <button
                type="button"
                className={`toggle-btn ${alcance === 'lote' ? 'active' : ''}`}
                onClick={() => { setAlcance('lote'); setAnimalId(''); setAnimalQuery(''); }}
              >🐄 Lote completo</button>
              <button
                type="button"
                className={`toggle-btn ${alcance === 'animal' ? 'active' : ''}`}
                onClick={() => setAlcance('animal')}
              >🔖 Animal específico</button>
            </div>
          </div>

          {/* Selector de animal */}
          {alcance === 'animal' && (
            <div className="form-group">
              <label className="form-label">Buscar animal por arete *</label>
              <input
                className="form-input"
                value={animalQuery}
                onChange={(e) => { setAnimalQuery(e.target.value); setAnimalId(''); }}
                placeholder="Número de arete..."
              />
              {animalQuery && !animalSeleccionado && animalesFiltrados.length > 0 && (
                <div className="animal-search-results">
                  {animalesFiltrados.slice(0, 5).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="animal-search-result"
                      onClick={() => { setAnimalId(a.id); setAnimalQuery(a.numeroArete); }}
                    >
                      #{a.numeroArete} · {a.raza} · {formatKg(a.pesoActual)}
                    </button>
                  ))}
                </div>
              )}
              {animalQuery && !animalSeleccionado && animalesFiltrados.length === 0 && (
                <div className="animal-search-empty">Animal no encontrado en este lote</div>
              )}
              {animalSeleccionado && (
                <div className="animal-search-selected">
                  ✅ <strong>#{animalSeleccionado.numeroArete}</strong> · {animalSeleccionado.raza} · {formatKg(animalSeleccionado.pesoActual)}
                </div>
              )}
            </div>
          )}

          {/* Tipo */}
          <div className="form-group">
            <label className="form-label">Tipo *</label>
            <div className="tipo-evento-grid">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`tipo-evento-btn ${tipo === t.value ? 'active' : ''}`}
                  onClick={() => setTipo(t.value)}
                >{t.label}</button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div className="form-group">
            <label className="form-label">Nombre del producto *</label>
            <input
              className="form-input"
              value={nombreProducto}
              onChange={(e) => setNombreProducto(e.target.value)}
              placeholder="ej. Ivomec, Clostrivac, ADE..."
              required
            />
          </div>

          {/* Fecha + Costo */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Fecha *</label>
              <input className="form-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Costo total (₡) *</label>
              <input className="form-input" type="number" min="0" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="0" required />
            </div>
          </div>

          {/* Dosis + Quién */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Dosis</label>
              <input className="form-input" value={dosis} onChange={(e) => setDosis(e.target.value)} placeholder="ej. 5ml/animal" />
            </div>
            <div className="form-group">
              <label className="form-label">Quién aplicó</label>
              <input className="form-input" value={quienAplico} onChange={(e) => setQuienAplico(e.target.value)} placeholder="Veterinario..." />
            </div>
          </div>

          {/* Próxima dosis */}
          <div className="form-group">
            <label className="form-label">Próxima dosis</label>
            <input className="form-input" type="date" value={proximaDosis} min={fecha} onChange={(e) => setProximaDosis(e.target.value)} />
            {proximaDosisInvalida && (
              <span className="form-error">La próxima dosis no puede ser anterior a la fecha del evento</span>
            )}
          </div>

          {/* Notas */}
          <div className="form-group">
            <label className="form-label">Notas</label>
            <input className="form-input" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones..." />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={!canSave || saving}>
              {saving ? 'Guardando...' : 'Guardar evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
