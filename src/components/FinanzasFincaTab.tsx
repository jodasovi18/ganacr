import { useMemo } from 'react';
import { Lote } from '@/types';
import { useFinanzasFinca } from '@/hooks/useFinanzasFinca';
import { formatColones, formatKg } from '@/utils/calculadora';
import { Card, CardContent } from '@/components/ui/card';

interface Props { fincaId: string | null; lotes: Lote[]; }

export default function FinanzasFincaTab({ fincaId, lotes }: Props) {
  const { filas, loading } = useFinanzasFinca(fincaId, lotes);
  const ordenadas = useMemo(
    () => [...filas].sort((a, b) => b.resultadoEstimado - a.resultadoEstimado),
    [filas],
  );
  const totalResultado = filas.reduce((s, f) => s + f.resultadoEstimado, 0);

  if (loading) return <p className="text-sm text-muted-foreground py-6">Calculando…</p>;
  if (filas.length === 0) return <p className="text-sm text-muted-foreground py-6">No hay lotes para comparar.</p>;

  return (
    <div className="space-y-3 py-3">
      <Card><CardContent className="p-3">
        <p className="text-xs text-muted-foreground">Resultado estimado total de la finca</p>
        <p className={`text-xl font-bold ${totalResultado >= 0 ? 'text-success' : 'text-destructive'}`}>
          {formatColones(totalResultado)}
        </p>
      </CardContent></Card>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Lote</th>
              <th className="px-3 py-2 text-right">Resultado est.</th>
              <th className="px-3 py-2 text-right">ROI</th>
              <th className="px-3 py-2 text-right">Costo engorde/kg</th>
              <th className="px-3 py-2 text-right">Ganancia diaria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ordenadas.map((f, i) => (
              <tr key={f.loteId} className="hover:bg-muted/50">
                <td className="px-3 py-2">
                  {i === 0 && <span title="Mejor">🥇 </span>}
                  {i === ordenadas.length - 1 && ordenadas.length > 1 && <span title="Peor">🔻 </span>}
                  {f.nombreLote}
                </td>
                <td className={`px-3 py-2 text-right ${f.resultadoEstimado >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatColones(f.resultadoEstimado)}
                </td>
                <td className="px-3 py-2 text-right">{f.roi.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right">{formatColones(f.costoEngordeKg)}</td>
                <td className="px-3 py-2 text-right">{formatKg(f.gananciaDiariaProm)}/día</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
