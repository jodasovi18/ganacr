import { useState } from 'react';
import { useCrearFinca } from '@/hooks/useFincas';
import { useFinca } from '@/contexts/FincaContext';
import { useAuth } from '@/contexts/AuthContext';
import { Finca } from '@/types';

export default function OnboardingFinca() {
  const { userData } = useAuth();
  const { setFincaActiva } = useFinca();
  const { crearPrimeraFinca } = useCrearFinca();

  const defaultNombre = userData?.nombreFinca?.trim() || '';
  const [nombre, setNombre] = useState(defaultNombre);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setError('');
    setSaving(true);
    try {
      const fincaId = await crearPrimeraFinca(nombre.trim());
      // The onSnapshot in FincaContext will pick this up automatically.
      // We also set it directly so the UI updates immediately.
      const now = new Date().toISOString();
      setFincaActiva({ id: fincaId, nombre: nombre.trim(), userId: '', createdAt: now, updatedAt: now } as Finca);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la finca');
      setSaving(false);
    }
    // Do NOT setSaving(false) on success — the onboarding unmounts once necesitaOnboarding becomes false
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>🌾</div>
          <h2 style={{ margin: 0 }}>Nombrá tu finca</h2>
          <p className="text-muted" style={{ marginTop: '0.3rem', fontSize: '0.88rem' }}>
            Podés cambiar este nombre después desde la barra superior.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre de la finca</label>
            <input
              className="input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Finca La Esperanza"
              required
              autoFocus
              maxLength={60}
              disabled={saving}
            />
            {defaultNombre && (
              <span className="form-hint">Pre-llenado desde tu perfil — editalo si querés</span>
            )}
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={saving || !nombre.trim()}
            >
              {saving ? 'Creando finca y migrando datos…' : 'Crear finca y continuar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
