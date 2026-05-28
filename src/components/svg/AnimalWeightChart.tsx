import { Peso } from '@/types';

interface Props {
  /** Ordered ascending by fecha */
  pesos: Peso[];
  /** Horizontal reference line: current lote average (from lote.pesoPromedio or animales avg) */
  pesoPromedioLote: number;
}

const W = 300, H = 120;
const ML = 38, MR = 10, MT = 10, MB = 22;
const CW = W - ML - MR;
const CH = H - MT - MB;

export default function AnimalWeightChart({ pesos, pesoPromedioLote }: Props) {
  if (pesos.length === 0) return null;

  // Unique gradient id per animal to avoid SVG id collisions when multiple
  // chart instances render on the same page.
  const gradId = `animalWeightGrad-${pesos[0].animalId}`;

  const valores = pesos.map((p) => p.peso);
  const allVals = [...valores, pesoPromedioLote];
  const minY = Math.min(...allVals) * 0.97;
  const maxY = Math.max(...allVals) * 1.03;
  const rangeY = maxY - minY || 1;

  function xPos(i: number) {
    return pesos.length === 1
      ? ML + CW / 2
      : ML + (i / (pesos.length - 1)) * CW;
  }
  function yPos(v: number) {
    return MT + (1 - (v - minY) / rangeY) * CH;
  }

  const refY = yPos(pesoPromedioLote);
  const pts = pesos.map((p, i) => `${xPos(i)},${yPos(p.peso)}`).join(' ');
  const first = pesos[0];
  const last = pesos[pesos.length - 1];
  const areaD =
    `M${xPos(0)},${yPos(first.peso)} ` +
    pesos.slice(1).map((p, i) => `L${xPos(i + 1)},${yPos(p.peso)}`).join(' ') +
    ` L${xPos(pesos.length - 1)},${H - MB} L${xPos(0)},${H - MB} Z`;

  const labelIdxs =
    pesos.length <= 4
      ? pesos.map((_, i) => i)
      : [0, Math.floor(pesos.length / 3), Math.floor((2 * pesos.length) / 3), pesos.length - 1];

  const gridVals = [0.25, 0.5, 0.75].map((t, idx) => ({
    idx,
    yv: MT + t * CH,
    label: Math.round(maxY - t * rangeY),
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="animal-weight-chart"
      aria-label="Evolución de peso del animal"
      style={{ width: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines + y labels */}
      {gridVals.map(({ idx, yv, label }) => (
        <g key={idx}>
          <line x1={ML} y1={yv} x2={W - MR} y2={yv}
            stroke="var(--color-border)" strokeWidth="0.6" />
          <text x={ML - 4} y={yv + 3} fontSize="7"
            fill="var(--color-text-muted)" textAnchor="end">{label}</text>
        </g>
      ))}

      {/* Reference line: lote average */}
      <line x1={ML} y1={refY} x2={W - MR} y2={refY}
        stroke="var(--color-primary-light)" strokeWidth="1.5"
        strokeDasharray="6,4" opacity="0.8" />
      <text x={W - MR - 2} y={refY - 3} fontSize="6.5"
        fill="var(--color-primary-light)" textAnchor="end">
        prom. lote
      </text>

      {/* Area fill */}
      {pesos.length > 1 && <path d={areaD} fill={`url(#${gradId})`} />}

      {/* Line */}
      {pesos.length > 1 && (
        <polyline points={pts} fill="none"
          stroke="var(--color-primary)" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />
      )}

      {/* Dots */}
      {pesos.map((p, i) => (
        <circle key={i} cx={xPos(i)} cy={yPos(p.peso)}
          r={p === last ? 5 : 3.5}
          fill={p === last ? 'var(--color-primary-dark)' : 'white'}
          stroke={p === last ? 'var(--color-accent)' : 'var(--color-primary)'}
          strokeWidth="2" />
      ))}

      {/* X-axis labels */}
      {labelIdxs.map((i) => {
        const parts = pesos[i].fecha.split('-');
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
