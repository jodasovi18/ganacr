// scripts/verify-backup.ts — valida la integridad de un backup en disco (NDJSON vs manifest).
// PURO: no inicializa Firebase ni requiere service-account.json.
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { COLECCIONES, type Manifest } from './backup-format';

export interface ResultadoVerificacion {
  ok: boolean;
  errores: string[];
  totalDocs: number;
}

export function verifyBackup(dir: string): ResultadoVerificacion {
  const errores: string[] = [];
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    return { ok: false, errores: [`No existe manifest.json en ${dir}`], totalDocs: 0 };
  }
  const manifest: Manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  let totalDocs = 0;
  for (const col of COLECCIONES) {
    const path = join(dir, `${col}.ndjson`);
    const esperado = manifest.colecciones[col] ?? 0;
    let real = 0;
    if (existsSync(path)) {
      const lineas = readFileSync(path, 'utf8').split('\n').filter((l) => l.trim().length > 0);
      for (const [idx, l] of lineas.entries()) {
        try { JSON.parse(l); real++; }
        catch { errores.push(`${col}.ndjson línea ${idx + 1}: JSON inválido`); }
      }
    }
    if (real !== esperado) errores.push(`${col}: manifest dice ${esperado}, hay ${real}`);
    totalDocs += real;
  }
  if (totalDocs !== manifest.totalDocs) {
    errores.push(`totalDocs: manifest dice ${manifest.totalDocs}, hay ${totalDocs}`);
  }
  return { ok: errores.length === 0, errores, totalDocs };
}

// CLI: npm run backup:verify -- <dir>
if (process.argv[1] && process.argv[1].includes('verify-backup')) {
  const dir = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!dir) { console.error('Uso: npm run backup:verify -- <dir>'); process.exit(1); }
  const r = verifyBackup(dir);
  if (r.ok) { console.log(`✅ Backup íntegro: ${r.totalDocs} documentos`); process.exit(0); }
  console.error('❌ Backup con problemas:');
  for (const e of r.errores) console.error(`   - ${e}`);
  process.exit(1);
}
