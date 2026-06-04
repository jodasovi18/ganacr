// scripts/backup-format.ts — constantes y tipos puros (NO inicializa Firebase).
// Importable por verify-backup y tests sin requerir service-account.json.

export const COLECCIONES = [
  'users', 'fincas', 'lotes', 'animales', 'pesos',
  'gastos', 'gastosFinca', 'eventosSanitarios', 'ventas',
] as const;

export interface Manifest {
  generadoEn: string;                   // ISO timestamp de generación
  projectId: string;                    // 'ganacr'
  colecciones: Record<string, number>;  // { lotes: 12, animales: 80, ... }
  totalDocs: number;
}
