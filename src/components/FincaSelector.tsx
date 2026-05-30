import { useState, useRef, useEffect } from 'react';
import { useFinca } from '@/contexts/FincaContext';
import { useCrearFinca, useActualizarFinca } from '@/hooks/useFincas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
    <div className="relative flex items-center gap-1" ref={dropdownRef}>
      {/* Chip — always visible */}
      <button
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[hsl(var(--border))] bg-white hover:bg-[hsl(var(--muted))] text-sm font-medium text-[hsl(var(--foreground))] max-w-[180px] transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={fincaActiva.nombre}
      >
        <span aria-hidden="true">🌾</span>
        <span className="truncate">{fincaActiva.nombre}</span>
        <span className="text-[hsl(var(--muted-foreground))] text-xs" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Ajustes button — only visible when dropdown is closed */}
      {!open && (
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
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 min-w-[180px] bg-white border border-[hsl(var(--border))] rounded-md shadow-md py-1"
          role="listbox"
        >
          {fincas.map((f) => (
            <button
              key={f.id}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[hsl(var(--muted))] transition-colors ${f.id === fincaActiva.id ? 'font-semibold text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`}
              role="option"
              aria-selected={f.id === fincaActiva.id}
              onClick={() => { setFincaActiva(f); setOpen(false); }}
            >
              {f.id === fincaActiva.id && <span className="text-[hsl(var(--primary))]">✓</span>}
              {f.nombre}
            </button>
          ))}
          <div className="border-t border-[hsl(var(--border))] mt-1 pt-1">
            <button
              className="w-full text-left px-3 py-2 text-sm text-[hsl(var(--primary))] font-medium hover:bg-[hsl(var(--muted))] transition-colors"
              onClick={() => { setShowNueva(true); setOpen(false); }}
            >
              ＋ Nueva finca
            </button>
          </div>
        </div>
      )}

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
