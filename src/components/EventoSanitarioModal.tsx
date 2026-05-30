import { useState } from 'react';
import { useAgregarEventoSanitario } from '@/hooks/useEventosSanitarios';
import { Animal, TipoEventoSanitario } from '@/types';
import { formatKg } from '@/utils/calculadora';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar evento sanitario</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Alcance */}
          <div className="space-y-1.5">
            <Label>Aplicar a</Label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  alcance === 'lote'
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                }`}
                onClick={() => { setAlcance('lote'); setAnimalId(''); setAnimalQuery(''); }}
              >
                🐄 Lote completo
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  alcance === 'animal'
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                }`}
                onClick={() => setAlcance('animal')}
              >
                🔖 Animal específico
              </button>
            </div>
          </div>

          {/* Selector de animal */}
          {alcance === 'animal' && (
            <div className="space-y-1.5">
              <Label>Buscar animal por arete *</Label>
              <Input
                value={animalQuery}
                onChange={(e) => { setAnimalQuery(e.target.value); setAnimalId(''); }}
                placeholder="Número de arete..."
              />
              {animalQuery && !animalSeleccionado && animalesFiltrados.length > 0 && (
                <div className="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
                  {animalesFiltrados.slice(0, 5).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] transition-colors border-b border-[hsl(var(--border))] last:border-0"
                      onClick={() => { setAnimalId(a.id); setAnimalQuery(a.numeroArete); }}
                    >
                      #{a.numeroArete} · {a.raza} · {formatKg(a.pesoActual)}
                    </button>
                  ))}
                </div>
              )}
              {animalQuery && !animalSeleccionado && animalesFiltrados.length === 0 && (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Animal no encontrado en este lote</p>
              )}
              {animalSeleccionado && (
                <div className="rounded-lg border border-[hsl(var(--success))] bg-[hsl(var(--success)/.08)] px-3 py-2 text-sm">
                  ✅ <strong>#{animalSeleccionado.numeroArete}</strong> · {animalSeleccionado.raza} · {formatKg(animalSeleccionado.pesoActual)}
                </div>
              )}
            </div>
          )}

          {/* Tipo */}
          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    tipo === t.value
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                      : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                  }`}
                  onClick={() => setTipo(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label>Nombre del producto *</Label>
            <Input
              value={nombreProducto}
              onChange={(e) => setNombreProducto(e.target.value)}
              placeholder="ej. Ivomec, Clostrivac, ADE..."
              required
            />
          </div>

          {/* Fecha + Costo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha *</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Costo total (₡) *</Label>
              <Input type="number" min="0" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="0" required />
            </div>
          </div>

          {/* Dosis + Quién */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Dosis</Label>
              <Input value={dosis} onChange={(e) => setDosis(e.target.value)} placeholder="ej. 5ml/animal" />
            </div>
            <div className="space-y-1.5">
              <Label>Quién aplicó</Label>
              <Input value={quienAplico} onChange={(e) => setQuienAplico(e.target.value)} placeholder="Veterinario..." />
            </div>
          </div>

          {/* Próxima dosis */}
          <div className="space-y-1.5">
            <Label>Próxima dosis</Label>
            <Input type="date" value={proximaDosis} min={fecha} onChange={(e) => setProximaDosis(e.target.value)} />
            {proximaDosisInvalida && (
              <p className="text-sm text-[hsl(var(--destructive))]">La próxima dosis no puede ser anterior a la fecha del evento</p>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones..." />
          </div>

          {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={!canSave || saving}>
              {saving ? 'Guardando...' : 'Guardar evento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
