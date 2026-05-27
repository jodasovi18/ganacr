import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import './Login.css';

export default function Login() {
  const { login, register } = useAuth();
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [nombreFinca, setNombreFinca] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (modo === 'login') {
        await login(email, password);
      } else {
        if (!nombre.trim()) { setError('El nombre es requerido'); setLoading(false); return; }
        await register(email, password, nombre, nombreFinca);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('user-not-found') || msg.includes('wrong-password')) {
        setError('Correo o contraseña incorrectos');
      } else if (msg.includes('email-already-in-use')) {
        setError('Este correo ya está registrado');
      } else if (msg.includes('weak-password')) {
        setError('La contraseña debe tener al menos 6 caracteres');
      } else {
        setError('Error: ' + msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-emoji">🐄</span>
          <h1>GanaCR</h1>
          <p>Sistema de Gestión Ganadera</p>
        </div>

        <div className="login-tabs">
          <button
            className={`login-tab ${modo === 'login' ? 'active' : ''}`}
            onClick={() => setModo('login')}
          >Ingresar</button>
          <button
            className={`login-tab ${modo === 'registro' ? 'active' : ''}`}
            onClick={() => setModo('registro')}
          >Registrarse</button>
        </div>

        <form onSubmit={handleSubmit}>
          {modo === 'registro' && (
            <>
              <div className="form-group">
                <label className="form-label">Tu nombre</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre de la finca (opcional)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ej: Finca La Esperanza"
                  value={nombreFinca}
                  onChange={(e) => setNombreFinca(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input
              className="form-input"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              className="form-input"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="btn btn-primary btn-full mt-2" type="submit" disabled={loading}>
            {loading ? 'Cargando...' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}
