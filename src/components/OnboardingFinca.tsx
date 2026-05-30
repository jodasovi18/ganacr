import { useState } from 'react';
import { useCrearFinca } from '@/hooks/useFincas';
import { useFinca } from '@/contexts/FincaContext';
import { useAuth } from '@/contexts/AuthContext';
import { Finca } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    <Dialog open modal>
      <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="text-center pb-1">
            <div className="text-5xl mb-2">🌾</div>
          </div>
          <DialogTitle className="text-center">Nombrá tu finca</DialogTitle>
          <DialogDescription className="text-center">
            Podés cambiar este nombre después desde la barra superior.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-finca-nombre">Nombre de la finca</Label>
            <Input
              id="onboarding-finca-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Finca La Esperanza"
              required
              autoFocus
              maxLength={60}
              disabled={saving}
            />
            {defaultNombre && (
              <p className="text-xs text-muted-foreground">
                Pre-llenado desde tu perfil — editalo si querés
              </p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={saving || !nombre.trim()}
          >
            {saving ? 'Creando finca y migrando datos…' : 'Crear finca y continuar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
