import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [nombreFinca, setNombreFinca] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [aceptoTerminos, setAceptoTerminos] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (modo === 'login') {
        await login(email, password);
      } else {
        if (!nombre.trim()) { setError('El nombre es requerido'); setLoading(false); return; }
        if (!aceptoTerminos) { setError('Debés aceptar los Términos y la Política de Privacidad'); setLoading(false); return; }
        await register(email, password, nombre, nombreFinca);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">
            🐄
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">GanaCR</h1>
          <p className="text-sm text-muted-foreground mt-1">Sistema de Gestión Ganadera</p>
        </div>

        <div className="flex mb-4 bg-muted rounded-lg p-1">
          <button
            type="button"
            onClick={() => setModo('login')}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${
              modo === 'login'
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => setModo('registro')}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${
              modo === 'registro'
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Registrarse
          </button>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </CardTitle>
            <CardDescription>
              {modo === 'login' ? 'Ingresá con tu cuenta de GanaCR' : 'Completá tus datos para registrarte'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {modo === 'registro' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="nombre">Tu nombre</Label>
                    <Input
                      id="nombre"
                      type="text"
                      placeholder="Ej: Juan Pérez"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nombreFinca">Nombre de la finca <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                    <Input
                      id="nombreFinca"
                      type="text"
                      placeholder="Ej: Finca La Esperanza"
                      value={nombreFinca}
                      onChange={(e) => setNombreFinca(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {modo === 'registro' && (
                <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aceptoTerminos}
                    onChange={(e) => setAceptoTerminos(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
                  />
                  <span>
                    Acepto los{' '}
                    <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-primary underline">Términos y Condiciones</a>
                    {' '}y la{' '}
                    <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-primary underline">Política de Privacidad</a>.
                  </span>
                </label>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || (modo === 'registro' && !aceptoTerminos)}
              >
                {loading ? 'Cargando...' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <a href="/terminos" target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">Términos</a>
          {' · '}
          <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">Privacidad</a>
        </p>
      </div>
    </div>
  );
}
