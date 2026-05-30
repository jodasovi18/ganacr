import { formatColones, formatFecha } from '@/utils/calculadora';
import { GastoFinca } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';

interface Props {
  gastosFinca: GastoFinca[];
  loading: boolean;
  onNuevo: () => void;
  onEliminar: (gf: GastoFinca) => void;
  deletingId: string | null;
}

export default function GastosFincaTab({
  gastosFinca,
  loading,
  onNuevo,
  onEliminar,
  deletingId,
}: Props) {
  if (loading) {
    return (
      <p className="text-center text-[hsl(var(--muted-foreground))] py-12">Cargando gastos de finca...</p>
    );
  }

  if (gastosFinca.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">💸</p>
        <p className="font-semibold text-[hsl(var(--foreground))] mb-1">Sin gastos de finca registrados</p>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          Registrá gastos que aplican a múltiples lotes, como vacunaciones masivas o desparasitaciones.
        </p>
        <Button onClick={onNuevo}>
          <Plus size={14} className="mr-1" /> Registrar primer gasto
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {gastosFinca.map((gf) => (
        <Card key={gf.id}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-[hsl(var(--foreground))] truncate">{gf.concepto}</span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {gf.tipo.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] mb-2">
                  <span>{formatFecha(gf.fecha)}</span>
                  <span>·</span>
                  <span>{gf.lotesAplicados.length} lote{gf.lotesAplicados.length !== 1 ? 's' : ''}</span>
                  {gf.quienPago && (
                    <>
                      <span>·</span>
                      <span>{gf.quienPago}</span>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {gf.lotesAplicados.map((la) => (
                    <span
                      key={la.loteId}
                      className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                    >
                      {la.nombreLote}: {formatColones(la.monto)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="font-bold text-[hsl(var(--foreground))]">{formatColones(gf.montoTotal)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))]"
                  title="Eliminar gasto de finca"
                  onClick={() => onEliminar(gf)}
                  disabled={deletingId === gf.id}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
