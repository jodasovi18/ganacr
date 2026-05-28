import { Peso } from '@/types';

export interface LoteAvgPoint {
  fecha: string;    // YYYY-MM-DD
  promedio: number; // kg, rounded to 1 decimal
}

/**
 * Computes the lote average weight at each date where at least one animal
 * was weighed. Uses a running-state algorithm: for each date (sorted asc),
 * updates each animal's known weight, then averages all known weights.
 * This correctly represents "what did the lote weigh on average on this date".
 */
export function calcularLoteAvgData(pesos: Peso[]): LoteAvgPoint[] {
  if (pesos.length === 0) return [];
  const sorted = [...pesos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const currentWeights = new Map<string, number>();
  const result: LoteAvgPoint[] = [];
  let i = 0;

  while (i < sorted.length) {
    const date = sorted[i].fecha.substring(0, 10);
    while (i < sorted.length && sorted[i].fecha.substring(0, 10) === date) {
      currentWeights.set(sorted[i].animalId, sorted[i].peso);
      i++;
    }
    const weights = Array.from(currentWeights.values());
    const avg = weights.reduce((s, w) => s + w, 0) / weights.length;
    result.push({ fecha: date, promedio: Math.round(avg * 10) / 10 });
  }

  return result;
}

interface Props {
  data: LoteAvgPoint[];
}

const W = 300, H = 110;
const ML = 38, MR = 10, MT = 10, MB = 22;
const CW = W - ML - MR;
const CH = H - MT - MB;

export default function LoteAvgChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="chart-empty-msg">Sin pesajes registrados en este lote.</p>
    );
  }

  const promedios = data.map((d) => d.promedio);
  const minY = Math.min(...promedios) * 0.97;
  const maxY = Math.max(...promedios) * 1.03;
  const rangeY = maxY - minY || 1;

  function xPos(i: number) {
    return data.length === 1
      ? ML + CW / 2
      : ML + (i / (data.length - 1)) * CW;
  }
  function yPos(v: number) {
    return MT + (1 - (v - minY) / rangeY) * CH;
  }

  const pts = data.map((d, i) => `${xPos(i)},${yPos(d.promedio)}`).join(' ');
  const last = data[data.length - 1];
  const first = data[0];
  const areaD =
    `M${xPos(0)},${yPos(first.promedio)} ` +
    data.slice(1).map((d, i) => `L${xPos(i + 1)},${yPos(d.promedio)}`).join(' ') +
    ` L${xPos(data.length - 1)},${H - MB} L${xPos(0)},${H - MB} Z`;

  // Show at most 4 x-axis labels evenly spaced
  const labelIdxs =
    data.length <= 4
      ? data.map((_, i) => i)
      : [0, Math.floor(data.length / 3), Math.floor((2 * data.length) / 3), data.length - 1];

  const gridVals = [0.25, 0.5, 0.75].map((t) => ({
    yv: MT + t * CH,
    label: Math.round(maxY - t * rangeY),
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="lote-avg-chart"
      aria-label="Evolución del promedio del lote"
      style={{ width: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id="loteAvgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines + y labels */}
      {gridVals.map(({ yv, label }) => (
        <g key={yv}>
          <line x1={ML} y1={yv} x2={W - MR} y2={yv}
            stroke="var(--color-border)" strokeWidth="0.6" />
          <text x={ML - 4} y={yv + 3} fontSize="7"
            fill="var(--color-text-muted)" textAnchor="end">{label}</text>
        </g>
      ))}

      {/* Area fill */}
      {data.length > 1 && <path d={areaD} fill="url(#loteAvgGrad)" />}

      {/* Line */}
      {data.length > 1 && (
        <polyline points={pts} fill="none"
          stroke="var(--color-primary)" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />
      )}

      {/* Dots */}
      {data.map((d, i) => (
        <circle key={i} cx={xPos(i)} cy={yPos(d.promedio)}
          r={d === last ? 4.5 : 3}
          fill={d === last ? 'var(--color-primary-dark)' : 'white'}
          stroke={d === last ? 'var(--color-accent)' : 'var(--color-primary)'}
          strokeWidth="2" />
      ))}

      {/* X-axis labels */}
      {labelIdxs.map((i) => {
        const parts = data[i].fecha.split('-');
        return (
          <text key={i} x={xPos(i)} y={H - 5} fontSize="7"
            fill="var(--color-text-muted)" textAnchor="middle">
            {`${parts[2]}/${parts[1]}`}
          </text>
        );
      })}
    </svg>
  );
}
