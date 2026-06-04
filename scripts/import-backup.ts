// scripts/import-backup.ts — restaura un backup NDJSON a Firestore.
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { db, COLECCIONES } from './backup-admin';

function leerNdjson(dir: string, col: string): { id: string; data: Record<string, unknown> }[] {
  const path = join(dir, `${col}.ndjson`);
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

export async function importBackup(dir: string, opts: { force?: boolean } = {}): Promise<number> {
  // Salvaguarda: abortar si el destino YA tiene datos (a menos que --force).
  // Evita pisar prod por accidente. Para DR se apunta a un proyecto NUEVO (vacío) y procede solo.
  if (!opts.force) {
    for (const col of COLECCIONES) {
      const snap = await db.collection(col).limit(1).get();
      if (!snap.empty) {
        throw new Error(
          `El destino NO está vacío (la colección "${col}" tiene datos). ` +
          'Usá --force para sobrescribir intencionalmente.',
        );
      }
    }
  }

  let total = 0;
  for (const col of COLECCIONES) {
    const docs = leerNdjson(dir, col);
    for (let i = 0; i < docs.length; i += 490) {
      const batch = db.batch();
      for (const { id, data } of docs.slice(i, i + 490)) {
        batch.set(db.collection(col).doc(id), data);
      }
      await batch.commit();
    }
    total += docs.length;
  }
  return total;
}

// CLI: npm run backup:import -- <dir> [--force]
if (process.argv[1] && process.argv[1].includes('import-backup')) {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const dir = args.find((a) => !a.startsWith('--'));
  if (!dir) { console.error('Uso: npm run backup:import -- <dir> [--force]'); process.exit(1); }
  importBackup(dir, { force })
    .then((n) => { console.log(`✅ Restaurados ${n} documentos desde ${dir}`); process.exit(0); })
    .catch((e) => { console.error(`❌ ${e.message}`); process.exit(1); });
}
