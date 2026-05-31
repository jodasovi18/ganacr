import { useState } from 'react';
import { useRegistrarMuerte } from '@/hooks/useAnimales';
import { Animal } from '@/types';
import { formatColones, formatKg } from '@/utils/calculadora';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  animal: Animal;
  onClose: () => void;
}

export default function RegistrarMuerteModal({ animal, onClose }: Props) {
  const { registrarMuerte } = useRegistrarMuerte();
  const hoy = new Date().toISOString().substring(0, 10);
  const [fecha, setFecha] = useState(hoy);
  const [precioKg, setPrecioKg] = useState('');
  const [causa, setCausa] = useState('');
  const [documentoVeterinario, setDocumentoVeterinario] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const precioKgNum = Number(precioKg);
  const valorPerdida = precioKgNum > 0 ? Math.round(animal.pesoActual * precioKgNum) : 0;
  const canSubmit = fecha !== '' && precioKgNum > 0 && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSaving(true);
    try {
      await registrarMuerte(animal, {
        fecha,
        precioKg: precioKgNum,
        causa,
        documentoVeterinario,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la muerte');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar muerte — {animal.numeroArete}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="muerte-fecha">Fecha de muerte</Label>
            <Input
              id="muerte-fecha"
              type="date"
              value={fecha}
              max={hoy}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="muerte-precio">Precio/kg estimado de mercado</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">₡</span>
              <Input
                id="muerte-precio"
                type="number"
                min={1}
                step={1}
                placeholder="0"
                value={precioKg}
                onChange={(e) => setPrecioKg(e.target.value)}
                required
                autoFocus
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">/ kg</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Peso actual: {formatKg(animal.pesoActual)}
              {valorPerdida > 0 && (
                <> · Pérdida estimada: <strong>{formatColones(valorPerdida)}</strong></>
              )}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="muerte-causa">Causa (opcional)</Label>
            <Input
              id="muerte-causa"
              type="text"
              placeholder="Enfermedad, accidente, etc."
              value={causa}
              onChange={(e) => setCausa(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="muerte-doc">Documento veterinario (opcional)</Label>
            <Input
              id="muerte-doc"
              type="text"
              placeholder="N° o descripción del dictamen"
              value={documentoVeterinario}
              onChange={(e) => setDocumentoVeterinario(e.target.value)}
            />
          </div>

          {/* Aviso fiscal */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            📋 <strong>Recordatorio:</strong> con un documento de respaldo emitido por un
            médico veterinario, el valor en libros de este animal puede considerarse pérdida
            deducible en tu declaración de renta (Ley 7092, art. 8), sujeto a los requisitos
            de la Dirección General de Tributación. Si lo tenés, guardá el dictamen. Consultá
            con tu contador.
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSubmit}>
              {saving ? 'Registrando...' : 'Registrar muerte'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
