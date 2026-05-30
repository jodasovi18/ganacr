import { useState, useEffect } from 'react';
import { useFinca } from '@/contexts/FincaContext';
import { useCrearFinca, useActualizarFinca } from '@/hooks/useFincas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Plus } from 'lucide-react';

export default function FincaSelector() {
  const { fincas, fincaActiva, setFincaActiva, loading } = useFinca();
  const { crearFinca } = useCrearFinca();
  const { actualizarUmbrales } = useActualizarFinca();
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
  // Sync threshold state when active finca changes (prevents stale values on finca switch)
  useEffect(() => {
    setUmbralAmarillo(fincaActiva?.pesoUmbralAmarillo ?? 15);
    setUmbralRojo(fincaActiva?.pesoUmbralRojo ?? 30);
  }, [fincaActiva?.id]);

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
    <div className="flex items-center gap-1">
      {/* Dropdown via shadcn DropdownMenu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="max-w-[200px] text-sm gap-1" title={fincaActiva.nombre}>
            <span aria-hidden="true">🌾</span>
            <span className="truncate">{fincaActiva.nombre}</span>
            <ChevronDown size={14} className="shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {fincas.map((f) => (
            <DropdownMenuItem
              key={f.id}
              onClick={() => setFincaActiva(f)}
              className={f.id === fincaActiva.id ? 'font-semibold' : ''}
            >
              {f.id === fincaActiva.id && <span className="text-[hsl(var(--primary))] mr-1">✓</span>}
              {f.nombre}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowNueva(true)}>
            <Plus size={14} className="mr-2" /> Nueva finca
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Ajustes button */}
      <button
        className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
        title="Ajustes de la finca"
        onClick={() => {
          setUmbralAmarillo(fincaActiva?.pesoUmbralAmarillo ?? 15);
          setUmbralRojo(fincaActiva?.pesoUmbralRojo ?? 30);
          setShowAjustes(true);
        }}
      >
        ⚙️
      </button>

      {/* Nueva finca modal */}
      <Dialog open={showNueva} onOpenChange={(o) => { if (!o) setShowNueva(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva finca</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrearFinca} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nueva-finca-nombre">Nombre de la finca</Label>
              <Input
                id="nueva-finca-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Finca El Roble"
                required
                autoFocus
                maxLength={60}
              />
            </div>
            {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setShowNueva(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !nombre.trim()}>
                {saving ? 'Creando...' : 'Crear finca'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ajustes modal */}
      <Dialog open={showAjustes} onOpenChange={(o) => { if (!o) setShowAjustes(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustes de pesaje — {fincaActiva?.nombre}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGuardarUmbrales} className="space-y-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Configurá cuántos días sin pesar activan cada alerta en la tab Pesos.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="umbral-amarillo">🟡 Días sin pesar → amarillo</Label>
              <Input
                id="umbral-amarillo"
                type="number"
                min={1}
                max={365}
                value={umbralAmarillo}
                onChange={(e) => setUmbralAmarillo(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="umbral-rojo">🔴 Días sin pesar → rojo</Label>
              <Input
                id="umbral-rojo"
                type="number"
                min={1}
                max={365}
                value={umbralRojo}
                onChange={(e) => setUmbralRojo(Number(e.target.value))}
                required
              />
            </div>
            {umbralError && <p className="text-sm text-[hsl(var(--destructive))]">{umbralError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setShowAjustes(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingUmbrales}>
                {savingUmbrales ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
