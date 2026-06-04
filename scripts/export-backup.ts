// scripts/export-backup.ts — exporta todas las colecciones Firestore a NDJSON + manifest.json.
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { db, PROJECT_ID, COLECCIONES } from './backup-admin';
import type { Manifest } from './backup-format';

export async function exportBackup(destDir?: string): Promise<{ dir: string; manifest: Manifest }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = destDir ?? resolve(process.cwd(), 'backups', timestamp);
  mkdirSync(dir, { recursive: true });

  const colecciones: Record<string, number> = {};
  let totalDocs = 0;

  for (const col of COLECCIONES) {
    const snap = await db.collection(col).get();
    const lines = snap.docs.map((d) => JSON.stringify({ id: d.id, data: d.data() }));
    writeFileSync(join(dir, `${col}.ndjson`), lines.length ? lines.join('\n') + '\n' : '');
    colecciones[col] = snap.size;
    totalDocs += snap.size;
  }

  const manifest: Manifest = {
    generadoEn: new Date().toISOString(),
    projectId: PROJECT_ID,
    colecciones,
    totalDocs,
  };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { dir, manifest };
}

// CLI: npm run backup:export
if (process.argv[1] && process.argv[1].includes('export-backup')) {
  exportBackup()
    .then(({ dir, manifest }) => {
      console.log(`✅ Backup en ${dir}`);
      for (const [col, n] of Object.entries(manifest.colecciones)) console.log(`   ${col}: ${n}`);
      console.log(`   TOTAL: ${manifest.totalDocs}`);
      process.exit(0);
    })
    .catch((e) => { console.error(e); process.exit(1); });
}
