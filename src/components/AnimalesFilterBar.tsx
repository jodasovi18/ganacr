import { useState } from 'react';
import { FiltroAnimales, FILTRO_VACIO, EstadoAnimal, OrigenAnimal, contarFiltrosActivos } from '@/utils/filtrarAnimales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SlidersHorizontal } from 'lucide-react';

interface Props {
  filtro: FiltroAnimales;
  onChange: (f: FiltroAnimales) => void;
  razasDisponibles: string[];
}

const ESTADOS: EstadoAnimal[] = ['activo', 'vendido', 'muerto'];
const ORIGENES: { value: OrigenAnimal; label: string }[] = [
  { value: 'comprado', label: 'Comprado' },
  { value: 'nacido_finca', label: 'Nacido en finca' },
  { value: 'sin_registro', label: 'Sin registro' },
];

function numOrNull(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function AnimalesFilterBar({ filtro, onChange, razasDisponibles }: Props) {
  const [open, setOpen] = useState(false);
  const activos = contarFiltrosActivos(filtro);

  function toggleEstado(e: EstadoAnimal) {
    const has = filtro.estados.includes(e);
    onChange({ ...filtro, estados: has ? filtro.estados.filter((x) => x !== e) : [...filtro.estados, e] });
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal size={14} className="mr-1" />
        Filtros
        {activos > 0 && <Badge variant="secondary" className="ml-2 text-xs">{activos}</Badge>}
      </Button>

      {open && (
        <div className="rounded-lg border border-border bg-card p-3 space-y-3">
          {/* Estado */}
          <div className="space-y-1.5">
            <Label className="text-xs">Estado</Label>
            <div className="flex flex-wrap gap-1.5">
              {ESTADOS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleEstado(e)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    filtro.estados.includes(e)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Raza */}
            <div className="space-y-1.5">
              <Label className="text-xs">Raza</Label>
              <select
                className="w-full border border-border rounded-md px-2 py-1.5 text-sm bg-background"
                value={filtro.raza}
                onChange={(e) => onChange({ ...filtro, raza: e.target.value })}
              >
                <option value="">Todas</option>
                {razasDisponibles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {/* Origen */}
            <div className="space-y-1.5">
              <Label className="text-xs">Origen</Label>
              <select
                className="w-full border border-border rounded-md px-2 py-1.5 text-sm bg-background"
                value={filtro.origen}
                onChange={(e) => onChange({ ...filtro, origen: e.target.value as FiltroAnimales['origen'] })}
              >
                <option value="">Todos</option>
                {ORIGENES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Rango peso */}
          <div className="space-y-1.5">
            <Label className="text-xs">Peso actual (kg)</Label>
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="Mín" value={filtro.pesoMin ?? ''} onChange={(e) => onChange({ ...filtro, pesoMin: numOrNull(e.target.value) })} />
              <span className="text-muted-foreground text-sm">—</span>
              <Input type="number" placeholder="Máx" value={filtro.pesoMax ?? ''} onChange={(e) => onChange({ ...filtro, pesoMax: numOrNull(e.target.value) })} />
            </div>
          </div>

          {/* Rango ganancia */}
          <div className="space-y-1.5">
            <Label className="text-xs">Ganancia (kg)</Label>
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="Mín" value={filtro.gananciaMin ?? ''} onChange={(e) => onChange({ ...filtro, gananciaMin: numOrNull(e.target.value) })} />
              <span className="text-muted-foreground text-sm">—</span>
              <Input type="number" placeholder="Máx" value={filtro.gananciaMax ?? ''} onChange={(e) => onChange({ ...filtro, gananciaMax: numOrNull(e.target.value) })} />
            </div>
          </div>

          {activos > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onChange(FILTRO_VACIO)}>
              Limpiar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
